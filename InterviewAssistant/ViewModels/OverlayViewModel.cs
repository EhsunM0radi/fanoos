using System;
using System.Collections.ObjectModel;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InterviewAssistant.Models;
using InterviewAssistant.Services.LLM;
using InterviewAssistant.Services.Settings;
using InterviewAssistant.Services.State;

namespace InterviewAssistant.ViewModels;

public partial class OverlayViewModel : ObservableObject
{
    private readonly ITranscriptStore _transcriptStore;
    private readonly ISettingsService _settingsService;
    private readonly ILLMProvider _llmProvider;
    private CancellationTokenSource? _copilotCts;

    [ObservableProperty]
    private string _currentInterimText = string.Empty;

    [ObservableProperty]
    private double _opacity = 0.85;

    [ObservableProperty]
    private double _fontSize = 15;

    [ObservableProperty]
    private bool _isAlwaysOnTop = true;

    [ObservableProperty]
    private string _copilotAnswer = string.Empty;

    [ObservableProperty]
    private bool _isGeneratingAnswer;

    public ObservableCollection<TranscriptEvent> FinalTranscriptHistory { get; } = new();

    public OverlayViewModel(
        ITranscriptStore transcriptStore,
        ISettingsService settingsService,
        ILLMProvider llmProvider)
    {
        _transcriptStore = transcriptStore;
        _settingsService = settingsService;
        _llmProvider = llmProvider;

        _transcriptStore.StoreChanged += OnStoreChanged;
        _ = LoadSettingsAsync();
    }

    private async Task LoadSettingsAsync()
    {
        var settings = await _settingsService.GetSettingsAsync();
        Opacity = settings.OverlayOpacity;
        FontSize = settings.OverlayFontSize;
        IsAlwaysOnTop = settings.AlwaysOnTop;
    }

    private void OnStoreChanged(object? sender, EventArgs e)
    {
        // Update on UI thread
        MainThread.BeginInvokeOnMainThread(() =>
        {
            CurrentInterimText = _transcriptStore.CurrentInterim;

            // Sync final transcripts
            if (_transcriptStore.FinalSegments.Count != FinalTranscriptHistory.Count)
            {
                FinalTranscriptHistory.Clear();
                foreach (var seg in _transcriptStore.FinalSegments)
                {
                    FinalTranscriptHistory.Add(seg);
                }

                // Question detection trigger for streaming LLM answer
                if (FinalTranscriptHistory.Count > 0)
                {
                    var lastSegment = FinalTranscriptHistory[^1].Text;
                    if (IsQuestionOrPrompt(lastSegment))
                    {
                        _ = TriggerCopilotAsync(lastSegment);
                    }
                }
            }
        });
    }

    private static bool IsQuestionOrPrompt(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        text = text.Trim();
        return text.EndsWith("?") ||
               text.StartsWith("Tell me about", StringComparison.OrdinalIgnoreCase) ||
               text.StartsWith("How do you", StringComparison.OrdinalIgnoreCase) ||
               text.StartsWith("What is", StringComparison.OrdinalIgnoreCase) ||
               text.StartsWith("Can you explain", StringComparison.OrdinalIgnoreCase) ||
               text.StartsWith("Describe a", StringComparison.OrdinalIgnoreCase) ||
               text.StartsWith("Why would", StringComparison.OrdinalIgnoreCase);
    }

    [RelayCommand]
    public async Task TriggerCopilotAsync(string question)
    {
        _copilotCts?.Cancel();
        _copilotCts = new CancellationTokenSource();

        IsGeneratingAnswer = true;
        CopilotAnswer = string.Empty;

        try
        {
            var req = new LLMRequest { UserPrompt = question };
            await foreach (var chunk in _llmProvider.StreamAsync(req, _copilotCts.Token))
            {
                CopilotAnswer += chunk.Text;
            }
        }
        catch (OperationCanceledException)
        {
            // Cancelled
        }
        finally
        {
            IsGeneratingAnswer = false;
        }
    }

    [RelayCommand]
    public void ClearTranscript()
    {
        _transcriptStore.Clear();
        FinalTranscriptHistory.Clear();
        CurrentInterimText = string.Empty;
        CopilotAnswer = string.Empty;
    }

    [RelayCommand]
    public async Task UpdateOpacityAsync(double newOpacity)
    {
        Opacity = Math.Clamp(newOpacity, 0.2, 1.0);
        var settings = await _settingsService.GetSettingsAsync();
        settings.OverlayOpacity = Opacity;
        await _settingsService.SaveSettingsAsync(settings);
    }

    [RelayCommand]
    public async Task UpdateFontSizeAsync(double newFontSize)
    {
        FontSize = Math.Clamp(newFontSize, 12, 28);
        var settings = await _settingsService.GetSettingsAsync();
        settings.OverlayFontSize = FontSize;
        await _settingsService.SaveSettingsAsync(settings);
    }
}
