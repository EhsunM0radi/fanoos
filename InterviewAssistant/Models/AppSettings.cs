namespace InterviewAssistant.Models;

public class AppSettings
{
    // Deepgram STT
    public string DeepgramApiKey { get; set; } = string.Empty;
    public string Provider { get; set; } = "Deepgram";
    public string Model { get; set; } = "nova-3";
    public string Language { get; set; } = "en";
    public bool InterimResults { get; set; } = true;
    public bool SmartFormatting { get; set; } = true;
    public int EndpointingMs { get; set; } = 300;

    // Audio Capture
    public string SelectedDeviceId { get; set; } = "default";
    public string CaptureMode { get; set; } = "Microphone"; // Microphone, SystemAudio, Combined

    // Overlay Window
    public double OverlayOpacity { get; set; } = 0.85;
    public double OverlayFontSize { get; set; } = 15;
    public bool AlwaysOnTop { get; set; } = true;
    public double OverlayX { get; set; } = 100;
    public double OverlayY { get; set; } = 100;
    public double OverlayWidth { get; set; } = 420;
    public double OverlayHeight { get; set; } = 280;

    // LLM Provider
    public string LLMProvider { get; set; } = "Gemini";
    public string LLMModel { get; set; } = "gemini-3.8-flash";
    public bool AutoCopilotAnswer { get; set; } = true;

    // Privacy Defaults
    public bool SaveAudio { get; set; } = false;
    public bool SaveTranscript { get; set; } = false;
    public bool SaveScreenshots { get; set; } = false;
    public bool ScreenCapture { get; set; } = false;
}
