using System;
using System.Net.Http;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InterviewAssistant.Models;
using InterviewAssistant.Services.LLM;
using InterviewAssistant.Services.Settings;

namespace InterviewAssistant.ViewModels;

public partial class SettingsViewModel : ObservableObject
{
    private readonly ISettingsService _settingsService;
    private readonly HttpClient _httpClient;
    private readonly ILLMRequestScheduler? _llmScheduler;

    // Deepgram STT
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

    // Audio Capture
    [ObservableProperty]
    private string _captureMode = "Microphone";

    // Overlay Window
    [ObservableProperty]
    private double _overlayOpacity = 0.85;

    [ObservableProperty]
    private double _overlayFontSize = 15;

    [ObservableProperty]
    private bool _alwaysOnTop = true;

    [ObservableProperty]
    private bool _autoScrollToBottom = true;

    [ObservableProperty]
    private string _theme = "Light"; // Light (Translucent), Dark

    // LLM Provider & Key
    [ObservableProperty]
    private string _llmProvider = "DeepSeek";

    [ObservableProperty]
    private string _llmModel = "deepseek-chat";

    [ObservableProperty]
    private string _llmApiKey = string.Empty;

    // LLM Trigger & Rate Limits
    [ObservableProperty]
    private string _llmTriggerMode = "Automatic";

    [ObservableProperty]
    private int _llmDebounceMs = 500;

    [ObservableProperty]
    private int _llmMinTriggerLength = 20;

    [ObservableProperty]
    private int _llmMaxRequestsPerMinute = 10;

    [ObservableProperty]
    private int _llmMinTimeBetweenRequestsMs = 2000;

    [ObservableProperty]
    private int _llmMaxConcurrentRequests = 1;

    // LLM Token & Context
    [ObservableProperty]
    private int _llmMaxContextTokens = 2000;

    [ObservableProperty]
    private int _llmMaxOutputTokens = 150;

    [ObservableProperty]
    private double _llmTemperature = 0.3;

    [ObservableProperty]
    private string _llmAnswerStyle = "Natural";

    // Cost Control
    [ObservableProperty]
    private int _llmMaxSessionRequests = 50;

    [ObservableProperty]
    private bool _llmStopWhenLimitReached = false;

    [ObservableProperty]
    private double _llmMaxEstimatedCostUsd = 1.00;

    // Candidate Profile
    [ObservableProperty]
    private string _candidateName = string.Empty;

    [ObservableProperty]
    private string _candidateExperience = "Senior Software Engineer (5+ years)";

    [ObservableProperty]
    private string _candidateSkills = ".NET, C#, Distributed Systems, WebSockets, Cloud";

    [ObservableProperty]
    private string _candidateRole = "Senior Backend Engineer";

    [ObservableProperty]
    private string _candidateProjects = "Low-latency streaming architecture, real-time audio pipeline";

    // Live Metrics Display
    [ObservableProperty]
    private int _sessionTotalRequests;

    [ObservableProperty]
    private int _sessionTotalInputTokens;

    [ObservableProperty]
    private int _sessionTotalOutputTokens;

    [ObservableProperty]
    private double _sessionAverageTtftMs;

    [ObservableProperty]
    private double _sessionEstimatedCostUsd;

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

    public SettingsViewModel(
        ISettingsService settingsService,
        HttpClient httpClient,
        ILLMRequestScheduler? llmScheduler = null)
    {
        _settingsService = settingsService;
        _httpClient = httpClient;
        _llmScheduler = llmScheduler;
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
        AutoScrollToBottom = s.AutoScrollToBottom;
        Theme = string.IsNullOrWhiteSpace(s.Theme) ? "Light" : s.Theme;
        SaveAudio = s.SaveAudio;
        SaveTranscript = s.SaveTranscript;
        SaveScreenshots = s.SaveScreenshots;
        ScreenCapture = s.ScreenCapture;

        // LLM Settings
        var llm = s.LLMSettings;
        LlmProvider = llm.Provider;
        LlmModel = llm.Model;
        LlmApiKey = llm.ApiKey;
        LlmTriggerMode = llm.TriggerMode;
        LlmDebounceMs = llm.DebounceMs;
        LlmMinTriggerLength = llm.MinTriggerLength;
        LlmMaxRequestsPerMinute = llm.MaxRequestsPerMinute;
        LlmMinTimeBetweenRequestsMs = llm.MinTimeBetweenRequestsMs;
        LlmMaxConcurrentRequests = llm.MaxConcurrentRequests;
        LlmMaxContextTokens = llm.MaxContextTokens;
        LlmMaxOutputTokens = llm.MaxOutputTokens;
        LlmTemperature = llm.Temperature;
        LlmAnswerStyle = llm.AnswerStyle;
        LlmMaxSessionRequests = llm.MaxSessionRequests;
        LlmStopWhenLimitReached = llm.StopWhenLimitReached;
        LlmMaxEstimatedCostUsd = llm.MaxEstimatedCostUsd;

        // Candidate Profile
        var prof = llm.CandidateProfile;
        CandidateName = prof.Name;
        CandidateExperience = prof.Experience;
        CandidateSkills = prof.MainSkills;
        CandidateRole = prof.CurrentRole;
        CandidateProjects = prof.ImportantProjects;

        // Sync live metrics if scheduler available
        if (_llmScheduler != null)
        {
            var m = _llmScheduler.SessionMetrics;
            SessionTotalRequests = m.TotalRequests;
            SessionTotalInputTokens = m.TotalInputTokens;
            SessionTotalOutputTokens = m.TotalOutputTokens;
            SessionAverageTtftMs = Math.Round(m.AverageTtftMs, 1);
            SessionEstimatedCostUsd = m.EstimatedCostUsd;
        }
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
            AutoScrollToBottom = AutoScrollToBottom,
            Theme = Theme,
            SaveAudio = SaveAudio,
            SaveTranscript = SaveTranscript,
            SaveScreenshots = SaveScreenshots,
            ScreenCapture = ScreenCapture,
            LLMProvider = LlmProvider,
            LLMModel = LlmModel,
            LLMSettings = new LLMSettings
            {
                Provider = LlmProvider,
                Model = LlmModel,
                ApiKey = LlmApiKey?.Trim() ?? string.Empty,
                TriggerMode = LlmTriggerMode,
                DebounceMs = LlmDebounceMs,
                MinTriggerLength = LlmMinTriggerLength,
                MaxRequestsPerMinute = LlmMaxRequestsPerMinute,
                MinTimeBetweenRequestsMs = LlmMinTimeBetweenRequestsMs,
                MaxConcurrentRequests = LlmMaxConcurrentRequests,
                MaxContextTokens = LlmMaxContextTokens,
                MaxOutputTokens = LlmMaxOutputTokens,
                Temperature = LlmTemperature,
                AnswerStyle = LlmAnswerStyle,
                MaxSessionRequests = LlmMaxSessionRequests,
                StopWhenLimitReached = LlmStopWhenLimitReached,
                MaxEstimatedCostUsd = LlmMaxEstimatedCostUsd,
                CandidateProfile = new CandidateProfile
                {
                    Name = CandidateName?.Trim() ?? string.Empty,
                    Experience = CandidateExperience?.Trim() ?? string.Empty,
                    MainSkills = CandidateSkills?.Trim() ?? string.Empty,
                    CurrentRole = CandidateRole?.Trim() ?? string.Empty,
                    ImportantProjects = CandidateProjects?.Trim() ?? string.Empty,
                    PreferredAnswerStyle = LlmAnswerStyle
                }
            }
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
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Token", DeepgramApiKey.Trim());

            var res = await _httpClient.SendAsync(req);
            if (res.IsSuccessStatusCode)
            {
                TestConnectionResult = "✓ Connected to Deepgram successfully!";
            }
            else
            {
                TestConnectionResult = $"✗ Deepgram returned {(int)res.StatusCode} ({res.ReasonPhrase})";
            }
        }
        catch (Exception ex)
        {
            TestConnectionResult = $"✗ Failed to connect: {ex.Message}";
        }
        finally
        {
            IsTesting = false;
        }
    }
}
