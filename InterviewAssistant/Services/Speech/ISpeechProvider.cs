using System;
using System.Threading;
using System.Threading.Tasks;
using InterviewAssistant.Models;

namespace InterviewAssistant.Services.Speech;

public enum SpeechConnectionState
{
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    Error
}

public interface ISpeechProvider : IDisposable
{
    SpeechConnectionState State { get; }

    Task ConnectAsync(CancellationToken cancellationToken = default);

    Task SendAudioAsync(byte[] audio, CancellationToken cancellationToken = default);

    Task DisconnectAsync();

    event EventHandler<TranscriptEvent>? TranscriptReceived;
    event EventHandler<SpeechConnectionState>? StateChanged;
}
