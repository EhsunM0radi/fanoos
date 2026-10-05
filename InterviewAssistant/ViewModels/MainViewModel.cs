using System;
using System.Collections.ObjectModel;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InterviewAssistant.Models;
using InterviewAssistant.Services.Audio;
using InterviewAssistant.Services.Overlay;
using InterviewAssistant.Services.Settings;
using InterviewAssistant.Services.Speech;
using InterviewAssistant.Services.State;
using Microsoft.Extensions.Logging;

namespace InterviewAssistant.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly IAudioCapture _audioCapture;
    private readonly ISpeechProvider _speechProvider;
    private readonly ITranscriptStore _transcriptStore;
    private readonly IOverlayWindowService _overlayService;
    private readonly ISettingsService _settingsService;
    private readonly ILogger<MainViewModel>? _logger;
    private CancellationTokenSource? _interviewCts;

    [ObservableProperty]
    private bool _isInterviewActive;

    [ObservableProperty]
    private string _statusText = "○ Stopped";

    [ObservableProperty]
    private string _statusColor = "#94A3B8"; // Slate gray

    [ObservableProperty]
    private string _speechProviderName = "Deepgram Nova-3";

    [ObservableProperty]
    private string _language = "English (en)";

    [ObservableProperty]
    private string _captureMode = "Microphone";

    [ObservableProperty]
    private AudioDevice? _selectedAudioDevice;

    public ObservableCollection<AudioDevice> AvailableDevices { get; } = new();

    public MainViewModel(
        IAudioCapture audioCapture,
        ISpeechProvider speechProvider,
        ITranscriptStore transcriptStore,
        IOverlayWindowService overlayService,
        ISettingsService settingsService,
        ILogger<MainViewModel>? logger = null)
    {
        _audioCapture = audioCapture;
        _speechProvider = speechProvider;
        _transcriptStore = transcriptStore;
        _overlayService = overlayService;
        _settingsService = settingsService;
        _logger = logger;

        _speechProvider.StateChanged += OnSpeechStateChanged;
        _speechProvider.TranscriptReceived += OnTranscriptReceived;
        _audioCapture.AudioChunkReceived += OnAudioChunkReceived;

        _ = InitializeAsync();
    }

    private async Task InitializeAsync()
    {
        var devices = await _audioCapture.GetAvailableDevicesAsync();
        AvailableDevices.Clear();
        foreach (var dev in devices)
        {
            AvailableDevices.Add(dev);
            if (dev.IsDefault) SelectedAudioDevice = dev;
        }

        var settings = await _settingsService.GetSettingsAsync();
        SpeechProviderName = $"Deepgram ({settings.Model})";
        CaptureMode = settings.CaptureMode;
    }

    private void OnSpeechStateChanged(object? sender, SpeechConnectionState state)
    {
        switch (state)
        {
            case SpeechConnectionState.Connected:
                StatusText = "● Listening";
                StatusColor = "#22C55E"; // Green
                break;
            case SpeechConnectionState.Connecting:
                StatusText = "● Connecting...";
                StatusColor = "#EAB308"; // Amber
                break;
            case SpeechConnectionState.Reconnecting:
                StatusText = "● Reconnecting...";
                StatusColor = "#F97316"; // Orange
                break;
            case SpeechConnectionState.Error:
                StatusText = "● Error / Check API Key";
                StatusColor = "#EF4444"; // Red
                break;
            case SpeechConnectionState.Disconnected:
            default:
                StatusText = "○ Stopped";
                StatusColor = "#94A3B8"; // Slate
                break;
        }
    }

    private void OnAudioChunkReceived(object? sender, byte[] chunk)
    {
        if (_isInterviewActive && _speechProvider.State == SpeechConnectionState.Connected)
        {
            _ = _speechProvider.SendAudioAsync(chunk);
        }
    }

    private void OnTranscriptReceived(object? sender, TranscriptEvent e)
    {
        if (e.IsFinal || e.SpeechFinal)
        {
            _transcriptStore.AddFinal(e);
        }
        else
        {
            _transcriptStore.UpdateInterim(e);
        }
    }

    [RelayCommand]
    public async Task StartInterviewAsync()
    {
        if (_isInterviewActive) return;

        try
        {
            _interviewCts = new CancellationTokenSource();
            _transcriptStore.Clear();

            StatusText = "● Connecting to Deepgram...";
            StatusColor = "#EAB308";

            // 1. Connect to Deepgram Nova-3 streaming WebSocket
            await _speechProvider.ConnectAsync(_interviewCts.Token);

            // 2. Start Microphone capture
            await _audioCapture.StartAsync(_interviewCts.Token);

            IsInterviewActive = true;
            StatusText = "● Listening";
            StatusColor = "#22C55E";

            // Open overlay window if not already visible
            if (!_overlayService.IsOverlayOpen)
            {
                await _overlayService.OpenOverlayAsync();
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to start interview: {Message}", ex.Message);
            StatusText = $"● Error: {ex.Message}";
            StatusColor = "#EF4444";
            IsInterviewActive = false;
        }
    }

    [RelayCommand]
    public async Task StopInterviewAsync()
    {
        if (!_isInterviewActive) return;

        _interviewCts?.Cancel();
        IsInterviewActive = false;

        await _audioCapture.StopAsync();
        await _speechProvider.DisconnectAsync();

        StatusText = "○ Stopped";
        StatusColor = "#94A3B8";
    }

    [RelayCommand]
    public async Task ToggleOverlayAsync()
    {
        await _overlayService.ToggleOverlayAsync();
    }
}
