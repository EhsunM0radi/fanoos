using System.Threading.Tasks;

namespace InterviewAssistant.Services.Overlay;

public interface IOverlayWindowService
{
    bool IsOverlayOpen { get; }
    Task OpenOverlayAsync();
    Task CloseOverlayAsync();
    Task ToggleOverlayAsync();
}
