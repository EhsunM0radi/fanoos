using System.Collections.Generic;
using System.Threading;
using InterviewAssistant.Models;

namespace InterviewAssistant.Services.LLM;

public interface ILLMProvider
{
    IAsyncEnumerable<LLMChunk> StreamAsync(
        LLMRequest request,
        CancellationToken cancellationToken = default);
}
