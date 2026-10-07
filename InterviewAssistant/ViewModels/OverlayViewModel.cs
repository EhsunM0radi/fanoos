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

    [ObservableProperty]
    private string _theme = "Light";

    [ObservableProperty]
    private string _transcriptDisplayMode = "compact"; // compact, full, hidden

    [ObservableProperty]
    private string _activeCopilotLens = "WhatShouldISay"; // WhatShouldISay, FollowUp, TechnicalAdvice, Negotiation, Summary

    [ObservableProperty]
    private string _myRole = "Senior Specialist";

    [ObservableProperty]
    private string _counterpartRole = "Client / Interviewer";

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
        Theme = string.IsNullOrWhiteSpace(settings.Theme) ? "Light" : settings.Theme;
        TranscriptDisplayMode = string.IsNullOrWhiteSpace(settings.TranscriptDisplayMode) ? "compact" : settings.TranscriptDisplayMode;
        ActiveCopilotLens = string.IsNullOrWhiteSpace(settings.ActiveCopilotLens) ? "WhatShouldISay" : settings.ActiveCopilotLens;
        MyRole = string.IsNullOrWhiteSpace(settings.MyRole) ? "Senior Specialist" : settings.MyRole;
        CounterpartRole = string.IsNullOrWhiteSpace(settings.CounterpartRole) ? "Client / Interviewer" : settings.CounterpartRole;
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

    [RelayCommand]
    public async Task SwitchLensAsync(string newLens)
    {
        if (string.IsNullOrWhiteSpace(newLens)) return;
        ActiveCopilotLens = newLens;
        var settings = await _settingsService.GetSettingsAsync();
        settings.ActiveCopilotLens = newLens;
        await _settingsService.SaveSettingsAsync(settings);
    }

    [RelayCommand]
    public async Task ToggleTranscriptDisplayModeAsync()
    {
        TranscriptDisplayMode = TranscriptDisplayMode switch
        {
            "compact" => "full",
            "full" => "hidden",
            _ => "compact"
        };
        var settings = await _settingsService.GetSettingsAsync();
        settings.TranscriptDisplayMode = TranscriptDisplayMode;
        await _settingsService.SaveSettingsAsync(settings);
    }

    [RelayCommand]
    public async Task ToggleThemeAsync()
    {
        Theme = Theme == "Light" ? "Dark" : "Light";
        var settings = await _settingsService.GetSettingsAsync();
        settings.Theme = Theme;
        await _settingsService.SaveSettingsAsync(settings);
    }
}
