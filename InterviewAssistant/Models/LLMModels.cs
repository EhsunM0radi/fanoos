using System;
using System.Collections.Generic;

namespace InterviewAssistant.Models;

public class LLMRequest
{
    public string SystemPrompt { get; set; } = "You are an elite interview copilot. Provide concise, high-impact talking points and structured answers (STAR format where appropriate). Keep responses brief and bulleted so they are effortless to glance at during a live conversation.";
    public string UserPrompt { get; set; } = string.Empty;
    public IReadOnlyList<string> ConversationContext { get; set; } = Array.Empty<string>();
}

public class LLMChunk
{
    public string Text { get; set; } = string.Empty;
    public bool IsFinal { get; set; }
}
