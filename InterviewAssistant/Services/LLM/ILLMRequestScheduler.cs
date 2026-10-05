using System;
using System.Threading;
using System.Threading.Tasks;
using InterviewAssistant.Models;

namespace InterviewAssistant.Services.LLM;

public interface ILLMRequestScheduler
{
    LLMSessionMetrics SessionMetrics { get; }

    bool IsGenerating { get; }

    event EventHandler<string>? AnswerChunkReceived;
    event EventHandler<string>? AnswerStarted;
    event EventHandler? AnswerCompleted;
    event EventHandler<string>? RequestRejected; // Rate limit or duplicate

    Task TriggerAsync(
        InterviewContext context,
        CancellationToken cancellationToken = default);

    Task CancelActiveRequestAsync();

    void ResetMetrics();
}
