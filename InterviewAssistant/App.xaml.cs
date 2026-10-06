using Microsoft.Maui.Controls;
using Microsoft.Extensions.Logging;

namespace InterviewAssistant;

public partial class App : Application
{
    private readonly AppShell _shell;
    private readonly ILogger<App>? _logger;

    public App(AppShell shell, ILogger<App>? logger = null)
    {
        InitializeComponent();
        _shell = shell;
        _logger = logger;
        _logger?.LogInformation("App constructor called");
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        _logger?.LogInformation("CreateWindow called");
        var window = new Window(_shell);
        window.Title = "AI Interview Assistant";
        window.MinimumWidth = 720;
        window.MinimumHeight = 540;

        window.Created += (s, e) => _logger?.LogInformation("Window Created event");
        window.Activated += (s, e) => _logger?.LogInformation("Window Activated event");
        window.Stopped += (s, e) => _logger?.LogInformation("Window Stopped event");

        return window;
    }
}