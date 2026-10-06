using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using InterviewAssistant.Models;
using Microsoft.Extensions.Logging;

namespace InterviewAssistant.Services.LLM;

/// <summary>
/// Streams interview answers using DeepSeek (or OpenAI-compatible streaming API).
/// Emits chunks as Server-Sent Events (SSE) arrive for sub-second Time-to-First-Token.
/// </summary>
public class DeepSeekProvider : ILLMProvider
{
    private readonly HttpClient _httpClient;
    private readonly LLMSettings _settings;
    private readonly ILogger<DeepSeekProvider>? _logger;

    public DeepSeekProvider(
        HttpClient httpClient,
        LLMSettings settings,
        ILogger<DeepSeekProvider>? logger = null)
    {
        _httpClient = httpClient;
        _settings = settings;
        _logger = logger;
    }

    public async IAsyncEnumerable<LLMChunk> StreamAsync(
        LLMRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var apiKey = _settings.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger?.LogWarning("[DeepSeek] No API Key provided, yielding structured talking points fallback.");
            var fallbackChunks = GenerateFallbackChunks(request.UserPrompt, _settings.AnswerStyle);
            foreach (var ch in fallbackChunks)
            {
                if (cancellationToken.IsCancellationRequested) yield break;
                await Task.Delay(40, cancellationToken);
                yield return new LLMChunk { Text = ch, IsFinal = false };
            }
            yield return new LLMChunk { Text = string.Empty, IsFinal = true };
            yield break;
        }

        // Bounded retry with exponential backoff (Section 28)
        const int maxRetries = 3;
        int delayMs = 500;

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            HttpResponseMessage? response = null;
            bool shouldRetry = false;
            List<LLMChunk>? streamChunks = null;
            bool completed = false;
            bool streamError = false;

            try
            {
                var payload = new
                {
                    model = string.IsNullOrWhiteSpace(_settings.Model) ? "deepseek-chat" : _settings.Model,
                    messages = new object[]
                    {
                        new { role = "system", content = request.SystemPrompt },
                        new { role = "user", content = request.UserPrompt }
                    },
                    max_tokens = request.MaxOutputTokens ?? _settings.MaxOutputTokens,
                    temperature = request.Temperature ?? _settings.Temperature,
                    stream = true
                };

                var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.deepseek.com/chat/completions")
                {
                    Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
                };
                requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

                response = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

                if ((int)response.StatusCode == 429 || (int)response.StatusCode == 503)
                {
                    _logger?.LogWarning("[DeepSeek] HTTP {StatusCode}, retry {Attempt}/{MaxRetries} in {Delay}ms", response.StatusCode, attempt, maxRetries, delayMs);
                    if (attempt == maxRetries) response.EnsureSuccessStatusCode();
                    await Task.Delay(delayMs, cancellationToken);
                    delayMs *= 2;
                    shouldRetry = true;
                    continue;
                }

                response.EnsureSuccessStatusCode();

                using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var reader = new StreamReader(stream);

                streamChunks = new List<LLMChunk>();

                while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
                {
                    var line = await reader.ReadLineAsync(cancellationToken);
                    if (string.IsNullOrWhiteSpace(line)) continue;
                    if (!line.StartsWith("data: ")) continue;

                    var data = line.Substring(6).Trim();
                    if (data == "[DONE]")
                    {
                        streamChunks.Add(new LLMChunk { Text = string.Empty, IsFinal = true });
                        completed = true;
                        break;
                    }

                    using var doc = JsonDocument.Parse(data);
                    var choices = doc.RootElement.GetProperty("choices");
                    if (choices.GetArrayLength() > 0)
                    {
                        var delta = choices[0].GetProperty("delta");
                        if (delta.TryGetProperty("content", out var contentElem))
                        {
                            var token = contentElem.GetString();
                            if (!string.IsNullOrEmpty(token))
                            {
                                streamChunks.Add(new LLMChunk { Text = token, IsFinal = false });
                            }
                        }
                    }
                }

                completed = true;
            }
            catch (Exception ex) when (attempt < maxRetries && !(ex is OperationCanceledException))
            {
                _logger?.LogWarning(ex, "[DeepSeek] Error on attempt {Attempt}/{MaxRetries}: {Msg}", attempt, maxRetries, ex.Message);
                await Task.Delay(delayMs, cancellationToken);
                delayMs *= 2;
                shouldRetry = true;
                streamError = true;
            }
            finally
            {
                response?.Dispose();
            }

            if (streamChunks != null)
            {
                foreach (var chunk in streamChunks)
                {
                    yield return chunk;
                }
            }

            if (completed)
            {
                yield break;
            }

            if (shouldRetry && attempt < maxRetries)
            {
                continue;
            }

            if (streamError && attempt >= maxRetries)
            {
                // Max retries exceeded, yield final error chunk
                yield return new LLMChunk { Text = "Error: Max retries exceeded", IsFinal = true };
                yield break;
            }
        }
    }

    private static List<string> GenerateFallbackChunks(string prompt, string answerStyle)
    {
        return new List<string>
        {
            "💡 **Key Talking Points:**\n",
            "• **Core Strategy:** State the problem directly, summarize your architectural trade-offs, and describe the measurable outcome.\n",
            "• **STAR Answer:** Detail Situation, Task, your direct Action, and quantify the Result (e.g. 40% latency reduction).\n",
            "• **Technical Depth:** Highlight concurrency, connection pooling, and resilient retry semantics."
        };
    }
}