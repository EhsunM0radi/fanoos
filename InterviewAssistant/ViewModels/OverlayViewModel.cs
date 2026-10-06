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
    private readonly ILLMRequestScheduler? _llmScheduler;

    [ObservableProperty]
    private string _currentInterimText = string.Empty;

    [ObservableProperty]
    private double _opacity = 0.85;

    [ObservableProperty]
    private double _fontSize = 15;

    [ObservableProperty]
    private bool _isAlwaysOnTop = true;

    [ObservableProperty]
    private bool _autoScrollToBottom = true;

    [ObservableProperty]
    private string _activeQuestion = string.Empty;

    [ObservableProperty]
    private string _copilotAnswer = string.Empty;

    [ObservableProperty]
    private bool _isGeneratingAnswer;

    public ObservableCollection<TranscriptParagraph> GroupedParagraphs { get; } = new();

    public OverlayViewModel(
        ITranscriptStore transcriptStore,
        ISettingsService settingsService,
        ILLMRequestScheduler? llmScheduler = null)
    {
        _transcriptStore = transcriptStore;
        _settingsService = settingsService;
        _llmScheduler = llmScheduler;

        _transcriptStore.StoreChanged += OnStoreChanged;

        if (_llmScheduler != null)
        {
            _llmScheduler.AnswerStarted += (s, q) =>
            {
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    ActiveQuestion = q;
                    CopilotAnswer = string.Empty;
                    IsGeneratingAnswer = true;
                });
            };

            _llmScheduler.AnswerChunkReceived += (s, chunk) =>
            {
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    CopilotAnswer += chunk;
                });
            };

            _llmScheduler.AnswerCompleted += (s, e) =>
            {
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    IsGeneratingAnswer = false;
                });
            };
        }

        _ = LoadSettingsAsync();
    }

    private async Task LoadSettingsAsync()
    {
        var settings = await _settingsService.GetSettingsAsync();
        Opacity = settings.OverlayOpacity;
        FontSize = settings.OverlayFontSize;
        IsAlwaysOnTop = settings.AlwaysOnTop;
        AutoScrollToBottom = settings.AutoScrollToBottom;
    }

    private void OnStoreChanged(object? sender, EventArgs e)
    {
        MainThread.BeginInvokeOnMainThread(() =>
        {
            CurrentInterimText = _transcriptStore.CurrentInterim;

            // Sync paragraphs
            if (_transcriptStore.GroupedParagraphs.Count != GroupedParagraphs.Count)
            {
                GroupedParagraphs.Clear();
                foreach (var p in _transcriptStore.GroupedParagraphs)
                {
                    GroupedParagraphs.Add(p);
                }
            }
        });
    }

    [RelayCommand]
    public async Task TriggerCopilotManualAsync(string question)
    {
        if (_llmScheduler != null)
        {
            await _llmScheduler.TriggerAsync(new InterviewContext
            {
                DetectedQuestion = question,
                TriggerSource = "Manual"
            });
        }
    }

    [RelayCommand]
    public void ClearTranscript()
    {
        _transcriptStore.Clear();
        GroupedParagraphs.Clear();
        CurrentInterimText = string.Empty;
        CopilotAnswer = string.Empty;
        ActiveQuestion = string.Empty;
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

    [RelayCommand]
    public async Task ToggleAutoScrollAsync()
    {
        AutoScrollToBottom = !AutoScrollToBottom;
        var settings = await _settingsService.GetSettingsAsync();
        settings.AutoScrollToBottom = AutoScrollToBottom;
        await _settingsService.SaveSettingsAsync(settings);
    }
}
