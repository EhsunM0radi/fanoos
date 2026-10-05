using System;

namespace InterviewAssistant.Models;

public class TranscriptEvent
{
    public string Text { get; set; } = string.Empty;

    public bool IsFinal { get; set; }

    public bool SpeechFinal { get; set; }

    public double? Confidence { get; set; }

    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}
