using System;
using System.Collections.Generic;
using InterviewAssistant.Models;

namespace InterviewAssistant.Services.State;

/// <summary>
/// Lightweight in-memory state store for live interim and final speech transcripts.
/// Thread-safe and reactive.
/// </summary>
public class TranscriptStore : ITranscriptStore
{
    private readonly object _lock = new();
    private string _currentInterim = string.Empty;
    private readonly List<TranscriptEvent> _finalSegments = new();

    public string CurrentInterim
    {
        get
        {
            lock (_lock) return _currentInterim;
        }
    }

    public IReadOnlyList<TranscriptEvent> FinalSegments
    {
        get
        {
            lock (_lock) return _finalSegments.ToArray();
        }
    }

    public event EventHandler? StoreChanged;

    public void UpdateInterim(TranscriptEvent transcript)
    {
        lock (_lock)
        {
            _currentInterim = transcript.Text;
        }
        StoreChanged?.Invoke(this, EventArgs.Empty);
    }

    public void AddFinal(TranscriptEvent transcript)
    {
        lock (_lock)
        {
            _currentInterim = string.Empty;
            _finalSegments.Add(transcript);
        }
        StoreChanged?.Invoke(this, EventArgs.Empty);
    }

    public void Clear()
    {
        lock (_lock)
        {
            _currentInterim = string.Empty;
            _finalSegments.Clear();
        }
        StoreChanged?.Invoke(this, EventArgs.Empty);
    }
}
