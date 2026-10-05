using System.Threading.Tasks;
using InterviewAssistant.Models;

namespace InterviewAssistant.Services.Settings;

public interface ISettingsService
{
    Task<AppSettings> GetSettingsAsync();
    Task SaveSettingsAsync(AppSettings settings);
    Task UpdateOverlayGeometryAsync(double x, double y, double width, double height);
}
