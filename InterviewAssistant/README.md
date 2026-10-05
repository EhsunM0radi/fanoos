# .NET MAUI AI Interview Assistant

A Windows-first AI Interview Assistant using **.NET 8 MAUI**, **Deepgram Nova-3 Streaming WebSocket STT**, and a floating always-on-top transcript & copilot overlay.

## Architecture Highlights
- **Audio Capture (`IAudioCapture`)**: 16 kHz, 16-bit Mono Linear PCM streaming chunks (~100ms) with zero disk I/O and non-blocking asynchronous dispatch.
- **Speech-to-Text (`ISpeechProvider`)**: High-performance persistent `ClientWebSocket` to Deepgram Nova-3 (`wss://api.deepgram.com/v1/listen`), yielding live interim words and final sentence commits.
- **Transcript State (`ITranscriptStore`)**: In-memory, thread-safe store maintaining reactive `CurrentInterim`, `FinalSegments[]`, and **automatically grouped paragraphs** (`GroupedParagraphs`) merging consecutive final segments within a 4-second window.
- **Download Transcript**: Instant session export to clean timestamped text file (`ExportTranscriptText()`).
- **Floating Overlay (`OverlayWindowService`)**: WinUI 3 AppWindow integration with `IsAlwaysOnTop = true`, adjustable opacity, dynamic font size, minimal dark aesthetic, and persistent window coordinates.
- **AI Copilot (`ILLMProvider`)**: Real-time question detection triggering streaming interview assistance (STAR structured points).
- **Vision Abstraction (`IVisionProvider`)**: One-time layout analyzer for optimal unobtrusive overlay positioning.

## Windows Build & Run Instructions

### Prerequisites
- Visual Studio 2022 (v17.8+) with the **.NET Multi-platform App UI development** workload installed.
- Or .NET 8 SDK with Windows workload:
  ```powershell
  dotnet workload install maui-windows
  ```

### Build & Run
```powershell
# Navigate to the project directory
cd InterviewAssistant

# Restore NuGet dependencies
dotnet restore

# Build targeting Windows
dotnet build -f net8.0-windows10.0.19041.0

# Run on Windows
dotnet run -f net8.0-windows10.0.19041.0
```

### Configuration
1. Launch the app.
2. Navigate to **Settings** and enter your **Deepgram API Key**.
3. Click **Test Connection** to verify your key against Deepgram's API.
4. Return to **Interview**, select your microphone, and click **Start Interview**.
5. The **Floating Overlay** will open and display real-time speech-to-text with interim and final transcripts!
