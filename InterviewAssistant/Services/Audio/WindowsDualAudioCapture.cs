using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using InterviewAssistant.Models;
using Microsoft.Extensions.Logging;

namespace InterviewAssistant.Services.Audio;

/// <summary>
/// Dual-channel audio capture engine for Windows:
/// Captures local speaker (Microphone/Headset) AND remote speaker (WASAPI System Audio Loopback)
/// with independent volume gain controls and mute toggles, mixing them cleanly into 16kHz PCM.
/// </summary>
public class WindowsDualAudioCapture : IAudioCapture
{
    private readonly ILogger<WindowsDualAudioCapture>? _logger;
    private readonly WindowsAudioCapture _micCapture;
    private readonly WindowsSystemAudioCapture _systemCapture;
    private bool _isCapturing;
    private CancellationTokenSource? _cts;

    // Adjustable volume levels (0.0 to 2.0 = 0% to 200%)
    public float MicGain { get; set; } = 1.0f;
    public float SystemGain { get; set; } = 1.0f;
    public bool MicMuted { get; set; } = false;
    public bool SystemMuted { get; set; } = false;

    // Speaker attribution
    public string LocalSpeakerLabel { get; set; } = "You";
    public string RemoteSpeakerLabel { get; set; } = "Counterpart";

    public bool IsCapturing => _isCapturing;
    public event EventHandler<byte[]>? AudioChunkReceived;

    public WindowsDualAudioCapture(ILogger<WindowsDualAudioCapture>? logger = null)
    {
        _logger = logger;
        _micCapture = new WindowsAudioCapture();
        _systemCapture = new WindowsSystemAudioCapture();

        // Forward mic chunks with gain and mute
        _micCapture.AudioChunkReceived += OnMicChunkReceived;
        _systemCapture.AudioChunkReceived += OnSystemChunkReceived;
    }

    public async Task<IReadOnlyList<AudioDevice>> GetAvailableDevicesAsync()
    {
        var micDevices = await _micCapture.GetAvailableDevicesAsync();
        return micDevices;
    }

    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        if (_isCapturing) return;

        _isCapturing = true;
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        _logger?.LogInformation("[DualAudio] Starting dual capture (Mic Gain: {MicGain:P0}, System Gain: {SysGain:P0})", MicGain, SystemGain);

        await _micCapture.StartAsync(_cts.Token);
        await _systemCapture.StartAsync(_cts.Token);
    }

    private void OnMicChunkReceived(object? sender, byte[] chunk)
    {
        if (!_isCapturing || MicMuted) return;

        var processed = ApplyGain(chunk, MicGain);
        AudioChunkReceived?.Invoke(this, processed);
    }

    private void OnSystemChunkReceived(object? sender, byte[] chunk)
    {
        if (!_isCapturing || SystemMuted) return;

        var processed = ApplyGain(chunk, SystemGain);
        AudioChunkReceived?.Invoke(this, processed);
    }

    private static byte[] ApplyGain(byte[] pcm16, float gain)
    {
        if (Math.Abs(gain - 1.0f) < 0.01f) return pcm16;

        var output = new byte[pcm16.Length];
        for (int i = 0; i < pcm16.Length; i += 2)
        {
            short sample = (short)(pcm16[i] | (pcm16[i + 1] << 8));
            int scaled = (int)(sample * gain);
            short clamped = (short)Math.Clamp(scaled, short.MinValue, short.MaxValue);
            output[i] = (byte)(clamped & 0xFF);
            output[i + 1] = (byte)((clamped >> 8) & 0xFF);
        }
        return output;
    }

    public async Task StopAsync()
    {
        if (!_isCapturing) return;

        _cts?.Cancel();
        _isCapturing = false;

        await _micCapture.StopAsync();
        await _systemCapture.StopAsync();

        _logger?.LogInformation("[DualAudio] Stopped dual audio capture");
    }

    public void Dispose()
    {
        _cts?.Cancel();
        _cts?.Dispose();
        _micCapture.Dispose();
        _systemCapture.Dispose();
    }
}
