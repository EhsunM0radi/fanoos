using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using InterviewAssistant.Models;

namespace InterviewAssistant.Services.Audio;

public interface IAudioCapture : IDisposable
{
    Task StartAsync(CancellationToken cancellationToken = default);
    Task StopAsync();
    bool IsCapturing { get; }
    event EventHandler<byte[]>? AudioChunkReceived;
    Task<IReadOnlyList<AudioDevice>> GetAvailableDevicesAsync();
}
