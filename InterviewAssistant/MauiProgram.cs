using InterviewAssistant.Services.Audio;
using InterviewAssistant.Services.LLM;
using InterviewAssistant.Services.Overlay;
using InterviewAssistant.Services.Settings;
using InterviewAssistant.Services.Speech;
using InterviewAssistant.Services.State;
using InterviewAssistant.Services.Vision;
using InterviewAssistant.ViewModels;
using InterviewAssistant.Views;
using Microsoft.Extensions.Logging;

namespace InterviewAssistant;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

#if DEBUG
        builder.Logging.AddDebug();
        builder.Logging.SetMinimumLevel(LogLevel.Trace);
#endif

        // HTTP Client
        builder.Services.AddHttpClient();

        // Core MVP Services
        builder.Services.AddSingleton<ISettingsService, SettingsService>();
        builder.Services.AddSingleton<ITranscriptStore, TranscriptStore>();
        builder.Services.AddSingleton<IAudioCapture, WindowsAudioCapture>();
        builder.Services.AddSingleton<ISpeechProvider, DeepgramSpeechProvider>();
        builder.Services.AddSingleton<IOverlayWindowService, OverlayWindowService>();
        builder.Services.AddSingleton<ILLMProvider, GeminiLLMProvider>();
        builder.Services.AddSingleton<ILLMRequestScheduler, LLMRequestScheduler>();
        builder.Services.AddSingleton<IVisionProvider, WindowsVisionProvider>();

        // ViewModels
        builder.Services.AddTransient<MainViewModel>();
        builder.Services.AddTransient<OverlayViewModel>();
        builder.Services.AddTransient<SettingsViewModel>();

        // Views
        builder.Services.AddTransient<MainPage>();
        builder.Services.AddTransient<OverlayPage>();
        builder.Services.AddTransient<SettingsPage>();

        // App with logger
        builder.Services.AddTransient<App>();

        return builder.Build();
    }
}
