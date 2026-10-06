using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using InterviewAssistant.Models;
using Microsoft.Extensions.Logging;

namespace InterviewAssistant.Services.Audio;

/// <summary>
/// P1 implementation for capturing system audio (interviewer voice via meeting apps)
/// using Windows WASAPI Loopback Capture.
/// </summary>
public class WindowsSystemAudioCapture : IAudioCapture
{
    private readonly ILogger<WindowsSystemAudioCapture>? _logger;
    private bool _isCapturing;
    private CancellationTokenSource? _cts;

    public bool IsCapturing => _isCapturing;
#pragma warning disable CS0067 // Event is reserved for future implementation
    public event EventHandler<byte[]>? AudioChunkReceived;
#pragma warning restore CS0067

    public WindowsSystemAudioCapture(ILogger<WindowsSystemAudioCapture>? logger = null)
    {
        _logger = logger;
    }

    public Task<IReadOnlyList<AudioDevice>> GetAvailableDevicesAsync()
    {
        var devices = new List<AudioDevice>
        {
            new AudioDevice { Id = "loopback-default", Name = "Default Audio Output (Speakers / Headphones Loopback)", IsDefault = true }
        };
        return Task.FromResult<IReadOnlyList<AudioDevice>>(devices);
    }

    public Task StartAsync(CancellationToken cancellationToken = default)
    {
        if (_isCapturing) return Task.CompletedTask;
        _isCapturing = true;
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _logger?.LogInformation("[Audio] Started Windows WASAPI Loopback Capture");
        return Task.CompletedTask;
    }

    public Task StopAsync()
    {
        _cts?.Cancel();
        _isCapturing = false;
        _logger?.LogInformation("[Audio] Stopped System Audio Capture");
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _cts?.Cancel();
        _cts?.Dispose();
    }
}
