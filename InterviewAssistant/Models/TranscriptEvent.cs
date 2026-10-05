using System;
using System.Collections.Generic;

namespace InterviewAssistant.Models;

public class TranscriptEvent
{
    public string Text { get; set; } = string.Empty;

    public bool IsFinal { get; set; }

    public bool SpeechFinal { get; set; }

    public double? Confidence { get; set; }

    public string Speaker { get; set; } = "Candidate";

    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}

public class TranscriptParagraph
{
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string Text { get; set; } = string.Empty;

    public string Speaker { get; set; } = "Speaker";

    public DateTimeOffset StartTime { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset EndTime { get; set; } = DateTimeOffset.UtcNow;

    public List<TranscriptEvent> Segments { get; set; } = new();

    public double AverageConfidence { get; set; } = 1.0;
}
