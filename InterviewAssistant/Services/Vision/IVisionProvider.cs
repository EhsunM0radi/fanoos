using System.Threading;
using System.Threading.Tasks;
using InterviewAssistant.Models;

namespace InterviewAssistant.Services.Vision;

public interface IVisionProvider
{
    Task<VisionResult> AnalyzeAsync(
        byte[] image,
        CancellationToken cancellationToken = default);
}
