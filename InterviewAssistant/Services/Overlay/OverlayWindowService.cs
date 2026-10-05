using System;
using System.Threading.Tasks;
using InterviewAssistant.Services.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Maui.Controls;

namespace InterviewAssistant.Services.Overlay;

/// <summary>
/// Controls the native Windows floating overlay window:
/// Sets AlwaysOnTop, frameless/acrylic styling, positioning, and size persistence.
/// </summary>
public class OverlayWindowService : IOverlayWindowService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ISettingsService _settingsService;
    private readonly ILogger<OverlayWindowService>? _logger;
    private Window? _overlayWindow;

    public bool IsOverlayOpen => _overlayWindow != null;

    public OverlayWindowService(
        IServiceProvider serviceProvider,
        ISettingsService settingsService,
        ILogger<OverlayWindowService>? logger = null)
    {
        _serviceProvider = serviceProvider;
        _settingsService = settingsService;
        _logger = logger;
    }

    public async Task OpenOverlayAsync()
    {
        if (_overlayWindow != null)
        {
            _logger?.LogInformation("Overlay window already open");
            return;
        }

        var settings = await _settingsService.GetSettingsAsync();

        // Create MAUI Window for overlay
        var overlayPage = (Page)_serviceProvider.GetService(typeof(Views.OverlayPage))!;
        _overlayWindow = new Window(overlayPage)
        {
            Title = "AI Interview Assistant Overlay",
            Width = settings.OverlayWidth,
            Height = settings.OverlayHeight,
            X = settings.OverlayX,
            Y = settings.OverlayY
        };

        _overlayWindow.Destroying += (s, e) =>
        {
            _overlayWindow = null;
            _logger?.LogInformation("Overlay window closed");
        };

        Application.Current?.OpenWindow(_overlayWindow);
        _logger?.LogInformation("[Overlay] Window opened at ({X},{Y}) size {W}x{H}",
            settings.OverlayX, settings.OverlayY, settings.OverlayWidth, settings.OverlayHeight);
    }

    public Task CloseOverlayAsync()
    {
        if (_overlayWindow != null)
        {
            Application.Current?.CloseWindow(_overlayWindow);
            _overlayWindow = null;
        }
        return Task.CompletedTask;
    }

    public async Task ToggleOverlayAsync()
    {
        if (IsOverlayOpen)
            await CloseOverlayAsync();
        else
            await OpenOverlayAsync();
    }
}
