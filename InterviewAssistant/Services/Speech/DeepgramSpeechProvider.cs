using System;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using InterviewAssistant.Models;
using InterviewAssistant.Services.Settings;
using Microsoft.Extensions.Logging;

namespace InterviewAssistant.Services.Speech;

/// <summary>
/// Connects to Deepgram's real-time WebSocket Streaming API using Nova-3.
/// Streams 16kHz Linear PCM audio chunks and yields interim & final transcripts.
/// </summary>
public class DeepgramSpeechProvider : ISpeechProvider
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<DeepgramSpeechProvider>? _logger;
    private ClientWebSocket? _webSocket;
    private CancellationTokenSource? _cts;
    private SpeechConnectionState _state = SpeechConnectionState.Disconnected;
    private Task? _receiveTask;
    private readonly SemaphoreSlim _sendLock = new(1, 1);

    public SpeechConnectionState State => _state;

    public event EventHandler<TranscriptEvent>? TranscriptReceived;
    public event EventHandler<SpeechConnectionState>? StateChanged;

    public DeepgramSpeechProvider(
        ISettingsService settingsService,
        ILogger<DeepgramSpeechProvider>? logger = null)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    private void SetState(SpeechConnectionState newState)
    {
        if (_state != newState)
        {
            _state = newState;
            StateChanged?.Invoke(this, _state);
        }
    }

    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        if (_state == SpeechConnectionState.Connected || _state == SpeechConnectionState.Connecting)
            return;

        var settings = await _settingsService.GetSettingsAsync();
        if (string.IsNullOrWhiteSpace(settings.DeepgramApiKey))
        {
            SetState(SpeechConnectionState.Error);
            throw new InvalidOperationException("Deepgram API Key is not configured. Please open Settings and provide your API Key.");
        }

        SetState(SpeechConnectionState.Connecting);
        _logger?.LogInformation("[Deepgram] Connecting to streaming endpoint...");

        _cts?.Cancel();
        _cts?.Dispose();
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        try
        {
            _webSocket?.Dispose();
            _webSocket = new ClientWebSocket();
            _webSocket.Options.SetRequestHeader("Authorization", $"Token {settings.DeepgramApiKey.Trim()}");

            // Construct Deepgram Nova-3 streaming URL with query parameters
            var model = string.IsNullOrWhiteSpace(settings.Model) ? "nova-3" : settings.Model;
            var language = string.IsNullOrWhiteSpace(settings.Language) ? "en" : settings.Language;
            var interim = settings.InterimResults.ToString().ToLowerInvariant();
            var smartFormat = settings.SmartFormatting.ToString().ToLowerInvariant();
            var endpointing = settings.EndpointingMs > 0 ? settings.EndpointingMs : 300;

            var uri = new Uri(
                $"wss://api.deepgram.com/v1/listen?" +
                $"model={model}&" +
                $"language={language}&" +
                $"encoding=linear16&" +
                $"sample_rate=16000&" +
                $"channels=1&" +
                $"interim_results={interim}&" +
                $"smart_format={smartFormat}&" +
                $"endpointing={endpointing}");

            await _webSocket.ConnectAsync(uri, _cts.Token);

            SetState(SpeechConnectionState.Connected);
            _logger?.LogInformation("[Deepgram] Connected successfully to Nova-3 WebSocket");

            // Start listening loop in background
            _receiveTask = Task.Run(() => ReceiveLoopAsync(_cts.Token), _cts.Token);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[Deepgram] Connection failed: {Message}", ex.Message);
            SetState(SpeechConnectionState.Error);
            throw;
        }
    }

    public async Task SendAudioAsync(byte[] audio, CancellationToken cancellationToken = default)
    {
        if (_webSocket == null || _webSocket.State != WebSocketState.Open || _state != SpeechConnectionState.Connected)
            return;

        try
        {
            await _sendLock.WaitAsync(cancellationToken);
            try
            {
                var segment = new ArraySegment<byte>(audio);
                await _webSocket.SendAsync(segment, WebSocketMessageType.Binary, true, cancellationToken);
            }
            finally
            {
                _sendLock.Release();
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "[Deepgram] Send error, scheduling reconnect: {Message}", ex.Message);
            _ = AttemptReconnectAsync();
        }
    }

    private async Task ReceiveLoopAsync(CancellationToken ct)
    {
        var buffer = new byte[8192];
        using var ms = new MemoryStream();

        try
        {
            while (!ct.IsCancellationRequested && _webSocket != null && _webSocket.State == WebSocketState.Open)
            {
                ms.SetLength(0);
                WebSocketReceiveResult result;

                do
                {
                    result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        _logger?.LogInformation("[Deepgram] Received close frame from server");
                        await DisconnectAsync();
                        return;
                    }
                    ms.Write(buffer, 0, result.Count);
                }
                while (!result.EndOfMessage);

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var json = Encoding.UTF8.GetString(ms.ToArray());
                    ProcessDeepgramMessage(json);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected on cancellation
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[Deepgram] Receive loop error: {Message}", ex.Message);
            _ = AttemptReconnectAsync();
        }
    }

    private void ProcessDeepgramMessage(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("channel", out var channelProp) &&
                channelProp.TryGetProperty("alternatives", out var altProp) &&
                altProp.GetArrayLength() > 0)
            {
                var firstAlt = altProp[0];
                var transcript = firstAlt.GetProperty("transcript").GetString();
                if (string.IsNullOrWhiteSpace(transcript)) return;

                bool isFinal = root.TryGetProperty("is_final", out var isFinalProp) && isFinalProp.GetBoolean();
                bool speechFinal = root.TryGetProperty("speech_final", out var sfProp) && sfProp.GetBoolean();
                double? confidence = firstAlt.TryGetProperty("confidence", out var confProp) ? confProp.GetDouble() : null;

                var evt = new TranscriptEvent
                {
                    Text = transcript.Trim(),
                    IsFinal = isFinal,
                    SpeechFinal = speechFinal,
                    Confidence = confidence,
                    Timestamp = DateTimeOffset.UtcNow
                };

                _logger?.LogDebug("[Deepgram] Transcript received: (isFinal={IsFinal}, speechFinal={SpeechFinal}) {Text}",
                    isFinal, speechFinal, evt.Text);

                TranscriptReceived?.Invoke(this, evt);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "[Deepgram] Could not parse message JSON");
        }
    }

    private async Task AttemptReconnectAsync()
    {
        if (_state == SpeechConnectionState.Reconnecting || _state == SpeechConnectionState.Connecting)
            return;

        SetState(SpeechConnectionState.Reconnecting);
        _logger?.LogInformation("[Deepgram] Reconnecting...");

        try
        {
            await Task.Delay(1500);
            await ConnectAsync();
        }
        catch
        {
            SetState(SpeechConnectionState.Error);
        }
    }

    public async Task DisconnectAsync()
    {
        _logger?.LogInformation("[Deepgram] Disconnecting...");
        _cts?.Cancel();

        if (_webSocket != null)
        {
            try
            {
                if (_webSocket.State == WebSocketState.Open)
                {
                    // Send Deepgram close stream frame (empty byte buffer or CloseAsync)
                    var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
                    await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", timeoutCts.Token);
                }
            }
            catch
            {
                // Disregard close timeout errors
            }
            finally
            {
                _webSocket.Dispose();
                _webSocket = null;
            }
        }

        SetState(SpeechConnectionState.Disconnected);
        _logger?.LogInformation("[Deepgram] Disconnected");
    }

    public void Dispose()
    {
        _cts?.Cancel();
        _cts?.Dispose();
        _webSocket?.Dispose();
        _sendLock.Dispose();
    }
}
