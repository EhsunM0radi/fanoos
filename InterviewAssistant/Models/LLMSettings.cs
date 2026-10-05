using System;

namespace InterviewAssistant.Models;

public class LLMSettings
{
    // Provider & Model
    public string Provider { get; set; } = "DeepSeek"; // DeepSeek, Gemini, OpenAI, OpenRouter
    public string Model { get; set; } = "deepseek-chat";
    public string ApiKey { get; set; } = string.Empty;

    // Trigger Mode & Debounce
    public string TriggerMode { get; set; } = "Automatic"; // Automatic, SpeechFinal, QuestionDetection, Debounced, Manual
    public int DebounceMs { get; set; } = 500; // 250, 500, 750, 1000, 1500, 2000
    public int MinTriggerLength { get; set; } = 20; // Min chars to prevent accidental calls

    // Rate Limits (Mandatory local enforcement)
    public int MaxRequestsPerMinute { get; set; } = 10;
    public int MinTimeBetweenRequestsMs { get; set; } = 2000;
    public int MaxConcurrentRequests { get; set; } = 1;

    // Token & Context Limits
    public int MaxContextTokens { get; set; } = 2000;
    public int MaxOutputTokens { get; set; } = 150;
    public double Temperature { get; set; } = 0.3;

    // Answer Style
    public string AnswerStyle { get; set; } = "Natural"; // Concise, Natural, Detailed

    // Cost Controls
    public int MaxSessionRequests { get; set; } = 50; // 0 for unlimited
    public bool StopWhenLimitReached { get; set; } = false;
    public double MaxEstimatedCostUsd { get; set; } = 1.00;

    // Candidate Profile
    public CandidateProfile CandidateProfile { get; set; } = new();
}
