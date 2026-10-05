using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using InterviewAssistant.Models;
using InterviewAssistant.Services.Settings;
using Microsoft.Extensions.Logging;

namespace InterviewAssistant.Services.LLM;

/// <summary>
/// Central scheduler that controls LLM interactions.
/// Enforces rate limiting, token limits, debouncing, question fingerprinting,
/// cancellation of obsolete requests, and tracks Time-to-First-Token (TTFT).
/// </summary>
public class LLMRequestScheduler : ILLMRequestScheduler
{
    private readonly ILLMProvider _llmProvider;
    private readonly ISettingsService _settingsService;
    private readonly ILogger<LLMRequestScheduler>? _logger;

    private readonly SemaphoreSlim _concurrencyLock = new(1, 1);
    private CancellationTokenSource? _activeGenerationCts;
    private readonly Queue<DateTimeOffset> _requestTimestamps = new();
    private DateTimeOffset _lastRequestCompleted = DateTimeOffset.MinValue;
    private readonly ConcurrentDictionary<string, DateTimeOffset> _recentQuestionFingerprints = new();

    public LLMSessionMetrics SessionMetrics { get; } = new();

    public bool IsGenerating { get; private set; }

    public event EventHandler<string>? AnswerChunkReceived;
    public event EventHandler<string>? AnswerStarted;
    public event EventHandler? AnswerCompleted;
    public event EventHandler<string>? RequestRejected;

    public LLMRequestScheduler(
        ILLMProvider llmProvider,
        ISettingsService settingsService,
        ILogger<LLMRequestScheduler>? logger = null)
    {
        _llmProvider = llmProvider;
        _settingsService = settingsService;
        _logger = logger;
    }

    public async Task TriggerAsync(
        InterviewContext context,
        CancellationToken cancellationToken = default)
    {
        var settings = await _settingsService.GetSettingsAsync();
        var llmSettings = settings.LLMSettings;

        var question = context.DetectedQuestion?.Trim() ?? string.Empty;

        // 1. Length Check
        if (question.Length < llmSettings.MinTriggerLength && context.TriggerSource != "Manual")
        {
            _logger?.LogDebug("[Scheduler] Skipped: text length {Len} < min {Min}", question.Length, llmSettings.MinTriggerLength);
            return;
        }

        // 2. Duplicate Question Prevention (Fingerprinting)
        var fingerprint = ComputeFingerprint(question);
        var now = DateTimeOffset.UtcNow;
        if (_recentQuestionFingerprints.TryGetValue(fingerprint, out var lastSeen) && (now - lastSeen).TotalSeconds < 30)
        {
            _logger?.LogWarning("[Scheduler] Prevented duplicate request for question: {Q}", question);
            RequestRejected?.Invoke(this, "Duplicate question ignored");
            return;
        }
        _recentQuestionFingerprints[fingerprint] = now;

        // 3. Local Rate Limit: Max Requests / Minute
        lock (_requestTimestamps)
        {
            while (_requestTimestamps.Count > 0 && (now - _requestTimestamps.Peek()).TotalSeconds > 60)
            {
                _requestTimestamps.Dequeue();
            }

            if (_requestTimestamps.Count >= llmSettings.MaxRequestsPerMinute && context.TriggerSource != "Manual")
            {
                _logger?.LogWarning("[Scheduler] Rate limit reached ({Count}/{Max} per min). Rejecting request.", _requestTimestamps.Count, llmSettings.MaxRequestsPerMinute);
                RequestRejected?.Invoke(this, $"Rate limit reached ({llmSettings.MaxRequestsPerMinute}/min)");
                return;
            }

            // 4. Rate Limit: Minimum Time Between Requests
            var elapsedSinceLast = (now - _lastRequestCompleted).TotalMilliseconds;
            if (elapsedSinceLast < llmSettings.MinTimeBetweenRequestsMs && context.TriggerSource != "Manual")
            {
                _logger?.LogWarning("[Scheduler] Debounce interval active ({Elapsed}ms < {Min}ms).", elapsedSinceLast, llmSettings.MinTimeBetweenRequestsMs);
                RequestRejected?.Invoke(this, "Throttled (minimum interval active)");
                return;
            }
        }

        // 5. Cost Control: Max Session Requests
        if (llmSettings.MaxSessionRequests > 0 && SessionMetrics.TotalRequests >= llmSettings.MaxSessionRequests)
        {
            if (llmSettings.StopWhenLimitReached)
            {
                _logger?.LogWarning("[Scheduler] Session limit reached ({Limit} requests).", llmSettings.MaxSessionRequests);
                RequestRejected?.Invoke(this, "Session limit reached");
                return;
            }
        }

        // 6. Cancel previous obsolete generation if running
        await CancelActiveRequestAsync();

        // 7. Debounce delay if configured
        if (llmSettings.DebounceMs > 0 && context.TriggerSource == "Debounced")
        {
            await Task.Delay(llmSettings.DebounceMs, cancellationToken);
        }

        // 8. Start Stream Generation
        _activeGenerationCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var genToken = _activeGenerationCts.Token;

        _ = Task.Run(async () =>
        {
            await _concurrencyLock.WaitAsync(genToken);
            var sw = Stopwatch.StartNew();
            long firstTokenTimeMs = 0;
            int totalTokensEmitted = 0;

            try
            {
                IsGenerating = true;
                AnswerStarted?.Invoke(this, question);

                lock (_requestTimestamps)
                {
                    _requestTimestamps.Enqueue(DateTimeOffset.UtcNow);
                }

                SessionMetrics.TotalRequests++;

                // Build bounded context and system prompt with candidate profile
                var request = BuildLLMRequest(question, context.RecentTranscripts, llmSettings);

                _logger?.LogInformation("[Scheduler] Sending LLM Request #{Num}: '{Prompt}'", SessionMetrics.TotalRequests, question);

                await foreach (var chunk in _llmProvider.StreamAsync(request, genToken))
                {
                    if (firstTokenTimeMs == 0 && !string.IsNullOrEmpty(chunk.Text))
                    {
                        firstTokenTimeMs = sw.ElapsedMilliseconds;
                        SessionMetrics.LastTtftMs = firstTokenTimeMs;
                        UpdateAverageTtft(firstTokenTimeMs);
                    }

                    if (!string.IsNullOrEmpty(chunk.Text))
                    {
                        totalTokensEmitted++;
                        AnswerChunkReceived?.Invoke(this, chunk.Text);
                    }

                    if (chunk.IsFinal) break;
                }

                SessionMetrics.TotalOutputTokens += totalTokensEmitted;
                SessionMetrics.TotalInputTokens += (question.Length / 4) + 150; // estimate input tokens
                EstimateSessionCost(llmSettings);

                var totalElapsedSec = sw.Elapsed.TotalSeconds;
                SessionMetrics.AverageResponseTimeSeconds = SessionMetrics.TotalRequests == 1
                    ? totalElapsedSec
                    : (SessionMetrics.AverageResponseTimeSeconds + totalElapsedSec) / 2.0;

                AnswerCompleted?.Invoke(this, EventArgs.Empty);
            }
            catch (OperationCanceledException)
            {
                _logger?.LogInformation("[Scheduler] LLM generation cancelled because a newer question arrived.");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "[Scheduler] Error during LLM generation: {Msg}", ex.Message);
            }
            finally
            {
                IsGenerating = false;
                _lastRequestCompleted = DateTimeOffset.UtcNow;
                _concurrencyLock.Release();
            }
        }, genToken);
    }

    public Task CancelActiveRequestAsync()
    {
        if (_activeGenerationCts != null && !_activeGenerationCts.IsCancellationRequested)
        {
            _activeGenerationCts.Cancel();
            _activeGenerationCts.Dispose();
            _activeGenerationCts = null;
            _logger?.LogInformation("[Scheduler] Cancelled active LLM request.");
        }
        return Task.CompletedTask;
    }

    public void ResetMetrics()
    {
        SessionMetrics.Reset();
    }

    private LLMRequest BuildLLMRequest(string question, IReadOnlyList<string> recentContext, LLMSettings settings)
    {
        var profile = settings.CandidateProfile;
        var sb = new StringBuilder();
        sb.AppendLine("You are an elite interview copilot assisting a candidate in real time.");
        sb.AppendLine($"Candidate Experience: {profile.Experience}. Role: {profile.CurrentRole}. Skills: {profile.MainSkills}.");
        sb.AppendLine($"Projects: {profile.ImportantProjects}.");
        sb.AppendLine($"Answer Style: {settings.AnswerStyle}. Provide concise, bulleted talking points and structured STAR answers so they are effortless to glance at during a call.");

        // Bounded recent context window (Section 20)
        var contextList = new List<string>();
        int tokenBudget = settings.MaxContextTokens;
        int currentCount = 0;

        for (int i = recentContext.Count - 1; i >= 0; i--)
        {
            var line = recentContext[i];
            int approxTokens = line.Length / 4;
            if (currentCount + approxTokens > tokenBudget) break;
            contextList.Insert(0, line);
            currentCount += approxTokens;
        }

        return new LLMRequest
        {
            SystemPrompt = sb.ToString(),
            UserPrompt = question,
            ConversationContext = contextList,
            MaxOutputTokens = settings.MaxOutputTokens,
            Temperature = settings.Temperature
        };
    }

    private void UpdateAverageTtft(long ttft)
    {
        SessionMetrics.AverageTtftMs = SessionMetrics.TotalRequests == 1
            ? ttft
            : (SessionMetrics.AverageTtftMs + ttft) / 2.0;
    }

    private void EstimateSessionCost(LLMSettings settings)
    {
        // Estimated blended cost: ~$0.14 per 1M input, ~$0.28 per 1M output for modern flash/deepseek
        double inputCost = (SessionMetrics.TotalInputTokens / 1_000_000.0) * 0.14;
        double outputCost = (SessionMetrics.TotalOutputTokens / 1_000_000.0) * 0.28;
        SessionMetrics.EstimatedCostUsd = Math.Round(inputCost + outputCost, 4);
    }

    private static string ComputeFingerprint(string text)
    {
        var normalized = string.Concat(text.Where(char.IsLetterOrDigit)).ToLowerInvariant();
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(bytes).Substring(0, 16);
    }
}
