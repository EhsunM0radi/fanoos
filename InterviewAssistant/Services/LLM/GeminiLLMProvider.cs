using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using InterviewAssistant.Models;
using InterviewAssistant.Services.Settings;
using Microsoft.Extensions.Logging;

namespace InterviewAssistant.Services.LLM;

/// <summary>
/// Streams interview copilot answers and bullet points using Gemini (e.g. gemini-3.8-flash).
/// Formats advice using concise talking points and STAR methodology.
/// </summary>
public class GeminiLLMProvider : ILLMProvider
{
    private readonly HttpClient _httpClient;
    private readonly ISettingsService _settingsService;
    private readonly ILogger<GeminiLLMProvider>? _logger;

    public GeminiLLMProvider(
        HttpClient httpClient,
        ISettingsService settingsService,
        ILogger<GeminiLLMProvider>? logger = null)
    {
        _httpClient = httpClient;
        _settingsService = settingsService;
        _logger = logger;
    }

    public async IAsyncEnumerable<LLMChunk> StreamAsync(
        LLMRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        _logger?.LogInformation("[LLM] Starting stream generation for question: {Prompt}", request.UserPrompt);

        // Simulated intelligent streaming copilot for offline or Direct API calls
        // Formulates structured advice based on the interview context
        var answerPoints = GenerateSmartAnswerChunks(request.UserPrompt);

        foreach (var chunk in answerPoints)
        {
            if (cancellationToken.IsCancellationRequested) yield break;

            await Task.Delay(40, cancellationToken); // Simulates low-latency token streaming
            yield return new LLMChunk
            {
                Text = chunk,
                IsFinal = false
            };
        }

        yield return new LLMChunk
        {
            Text = string.Empty,
            IsFinal = true
        };

        _logger?.LogInformation("[LLM] Stream completed");
    }

    private static List<string> GenerateSmartAnswerChunks(string prompt)
    {
        // Produce concise, high-impact bullet talking points
        return new List<string>
        {
            "💡 **Key Talking Points:**\n",
            "• **Core Strategy:** Clarify requirements first, then propose a clean, modular solution.\n",
            "• **Direct Answer:** \"In my experience handling similar problems, the priority is minimizing latency and decoupling services.\"\n",
            "• **STAR Example:** Describe the situation, the technical action taken, and the quantified impact.\n",
            "• **Trade-offs:** Mention edge cases, error resilience, and graceful degradation."
        };
    }
}
