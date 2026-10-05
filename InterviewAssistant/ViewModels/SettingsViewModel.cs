using System;
using System.Net.Http;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InterviewAssistant.Models;
using InterviewAssistant.Services.Settings;

namespace InterviewAssistant.ViewModels;

public partial class SettingsViewModel : ObservableObject
{
    private readonly ISettingsService _settingsService;
    private readonly HttpClient _httpClient;

    [ObservableProperty]
    private string _deepgramApiKey = string.Empty;

    [ObservableProperty]
    private string _provider = "Deepgram";

    [ObservableProperty]
    private string _model = "nova-3";

    [ObservableProperty]
    private string _language = "en";

    [ObservableProperty]
    private bool _interimResults = true;

    [ObservableProperty]
    private bool _smartFormatting = true;

    [ObservableProperty]
    private int _endpointingMs = 300;

    [ObservableProperty]
    private string _captureMode = "Microphone";

    [ObservableProperty]
    private double _overlayOpacity = 0.85;

    [ObservableProperty]
    private double _overlayFontSize = 15;

    [ObservableProperty]
    private bool _alwaysOnTop = true;

    // Privacy Defaults
    [ObservableProperty]
    private bool _saveAudio = false;

    [ObservableProperty]
    private bool _saveTranscript = false;

    [ObservableProperty]
    private bool _saveScreenshots = false;

    [ObservableProperty]
    private bool _screenCapture = false;

    [ObservableProperty]
    private string _testConnectionResult = string.Empty;

    [ObservableProperty]
    private bool _isTesting;

    public SettingsViewModel(ISettingsService settingsService, HttpClient httpClient)
    {
        _settingsService = settingsService;
        _httpClient = httpClient;
        _ = LoadSettingsAsync();
    }

    private async Task LoadSettingsAsync()
    {
        var s = await _settingsService.GetSettingsAsync();
        DeepgramApiKey = s.DeepgramApiKey;
        Provider = s.Provider;
        Model = s.Model;
        Language = s.Language;
        InterimResults = s.InterimResults;
        SmartFormatting = s.SmartFormatting;
        EndpointingMs = s.EndpointingMs;
        CaptureMode = s.CaptureMode;
        OverlayOpacity = s.OverlayOpacity;
        OverlayFontSize = s.OverlayFontSize;
        AlwaysOnTop = s.AlwaysOnTop;
        SaveAudio = s.SaveAudio;
        SaveTranscript = s.SaveTranscript;
        SaveScreenshots = s.SaveScreenshots;
        ScreenCapture = s.ScreenCapture;
    }

    [RelayCommand]
    public async Task SaveAsync()
    {
        var s = new AppSettings
        {
            DeepgramApiKey = DeepgramApiKey?.Trim() ?? string.Empty,
            Provider = Provider,
            Model = Model,
            Language = Language,
            InterimResults = InterimResults,
            SmartFormatting = SmartFormatting,
            EndpointingMs = EndpointingMs,
            CaptureMode = CaptureMode,
            OverlayOpacity = OverlayOpacity,
            OverlayFontSize = OverlayFontSize,
            AlwaysOnTop = AlwaysOnTop,
            SaveAudio = SaveAudio,
            SaveTranscript = SaveTranscript,
            SaveScreenshots = SaveScreenshots,
            ScreenCapture = ScreenCapture
        };

        await _settingsService.SaveSettingsAsync(s);
        TestConnectionResult = "Settings saved successfully.";
    }

    [RelayCommand]
    public async Task TestConnectionAsync()
    {
        if (string.IsNullOrWhiteSpace(DeepgramApiKey))
        {
            TestConnectionResult = "Please enter an API Key first.";
            return;
        }

        IsTesting = true;
        TestConnectionResult = "Testing connection to Deepgram...";

        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.deepgram.com/v1/projects");
            req.Headers.Add("Authorization", $"Token {DeepgramApiKey.Trim()}");

            var res = await _httpClient.SendAsync(req);
            if (res.IsSuccessStatusCode)
            {
                TestConnectionResult = "Connection successful! Valid Deepgram API Key.";
            }
            else
            {
                TestConnectionResult = $"Connection failed: HTTP {(int)res.StatusCode} {res.ReasonPhrase}";
            }
        }
        catch (Exception ex)
        {
            TestConnectionResult = $"Connection error: {ex.Message}";
        }
        finally
        {
            IsTesting = false;
        }
    }
}
