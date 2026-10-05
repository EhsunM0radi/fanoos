using System;
using System.Collections.Generic;

namespace InterviewAssistant.Models;

public class LLMRequest
{
    public string SystemPrompt { get; set; } = "";

    public string UserPrompt { get; set; } = "";

    public IReadOnlyList<string> ConversationContext { get; set; } = Array.Empty<string>();

    public int? MaxOutputTokens { get; set; }

    public double? Temperature { get; set; }
}

public class LLMChunk
{
    public string Text { get; set; } = "";

    public bool IsFinal { get; set; }

    public int? InputTokens { get; set; }

    public int? OutputTokens { get; set; }
}

public class InterviewContext
{
    public string DetectedQuestion { get; set; } = string.Empty;

    public string TriggerSource { get; set; } = "Automatic"; // SpeechFinal, QuestionDetection, Debounced, Manual

    public IReadOnlyList<string> RecentTranscripts { get; set; } = Array.Empty<string>();

    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}

public class CandidateProfile
{
    public string Name { get; set; } = string.Empty;

    public string Experience { get; set; } = "Senior Software Engineer (5+ years)";

    public string MainSkills { get; set; } = ".NET, C#, Distributed Systems, WebSockets, Cloud";

    public string CurrentRole { get; set; } = "Senior Backend Engineer";

    public string ImportantProjects { get; set; } = "Low-latency streaming architecture, real-time audio pipeline";

    public string PreferredAnswerStyle { get; set; } = "Natural"; // Concise, Natural, Detailed
}

public class LLMSessionMetrics
{
    public int TotalRequests { get; set; }

    public int TotalInputTokens { get; set; }

    public int TotalOutputTokens { get; set; }

    public double AverageTtftMs { get; set; }

    public double LastTtftMs { get; set; }

    public double AverageResponseTimeSeconds { get; set; }

    public double EstimatedCostUsd { get; set; }

    public void Reset()
    {
        TotalRequests = 0;
        TotalInputTokens = 0;
        TotalOutputTokens = 0;
        AverageTtftMs = 0;
        LastTtftMs = 0;
        AverageResponseTimeSeconds = 0;
        EstimatedCostUsd = 0;
    }
}
