import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Layers, 
  Terminal, 
  Settings as SettingsIcon, 
  Radio, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink,
  Sliders,
  Volume2
} from 'lucide-react';
import { 
  TranscriptEvent, 
  AppSettings, 
  ConnectionState, 
  AudioDevice, 
  CopilotAnswer 
} from './types';
import { BrowserAudioCapture } from './services/audioCapture';
import { DeepgramLiveClient } from './services/deepgramLive';
import { MainWindow } from './components/MainWindow';
import { FloatingOverlay } from './components/FloatingOverlay';
import { SettingsModal } from './components/SettingsModal';
import { MauiCodeExplorer } from './components/MauiCodeExplorer';

const DEFAULT_SETTINGS: AppSettings = {
  deepgramApiKey: '',
  provider: 'Deepgram',
  model: 'nova-3',
  language: 'en',
  interimResults: true,
  smartFormatting: true,
  endpointingMs: 300,
  selectedDeviceId: 'default',
  captureMode: 'Microphone',
  overlayOpacity: 0.88,
  overlayFontSize: 15,
  alwaysOnTop: true,
  saveAudio: false,
  saveTranscript: false,
  saveScreenshots: false,
  screenCapture: false,
};

export default function App() {
  const [activeView, setActiveView] = useState<'assistant' | 'code'>('assistant');
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [status, setStatus] = useState<ConnectionState>('disconnected');
  const [currentInterim, setCurrentInterim] = useState('');
  const [finalTranscripts, setFinalTranscripts] = useState<TranscriptEvent[]>([]);
  const [copilotAnswer, setCopilotAnswer] = useState<CopilotAnswer | null>(null);
  const [audioVolume, setAudioVolume] = useState(0);
  const [isOverlayOpen, setIsOverlayOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Settings State with LocalStorage Persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('interview_assistant_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');

  // Services References
  const audioCaptureRef = useRef<BrowserAudioCapture | null>(null);
  const deepgramClientRef = useRef<DeepgramLiveClient | null>(null);
  const simulationTimerRef = useRef<number | null>(null);

  // Initialize Audio & Enumerate Devices
  useEffect(() => {
    const audioCapture = new BrowserAudioCapture();
    const deepgramClient = new DeepgramLiveClient();

    audioCaptureRef.current = audioCapture;
    deepgramClientRef.current = deepgramClient;

    // Hook up audio chunk forwarder to Deepgram WebSocket
    audioCapture.onChunk((chunk) => {
      deepgramClient.sendAudio(chunk);
    });

    // Hook up audio volume meter
    audioCapture.onVolume((vol) => {
      setAudioVolume(vol);
    });

    // Hook up Deepgram transcripts
    deepgramClient.onTranscript((evt) => {
      if (evt.isFinal || evt.speechFinal) {
        setCurrentInterim('');
        setFinalTranscripts((prev) => [...prev, evt]);
        checkForQuestionAndTriggerCopilot(evt.text);
      } else {
        setCurrentInterim(evt.text);
      }
    });

    deepgramClient.onStateChange((newState) => {
      setStatus(newState);
    });

    // Enumerate hardware audio devices
    audioCapture.getDevices().then((devices) => {
      setAudioDevices(
        devices.map((d, i) => ({
          id: d.deviceId || `device-${i}`,
          name: d.label || `Microphone ${i + 1}`,
          isDefault: i === 0,
        }))
      );
    });

    return () => {
      audioCapture.stop();
      deepgramClient.disconnect();
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, []);

  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('interview_assistant_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  // Question Detector & Copilot Trigger
  const checkForQuestionAndTriggerCopilot = (text: string) => {
    const clean = text.trim();
    const isQuestion = 
      clean.endsWith('?') ||
      clean.toLowerCase().includes('tell me about') ||
      clean.toLowerCase().includes('how would you') ||
      clean.toLowerCase().includes('what is') ||
      clean.toLowerCase().includes('can you explain') ||
      clean.toLowerCase().includes('walk me through');

    if (isQuestion) {
      handleTriggerCopilot(clean);
    }
  };

  const handleTriggerCopilot = async (question: string) => {
    const answerId = Date.now().toString();
    setCopilotAnswer({
      id: answerId,
      question,
      answer: '',
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    });

    try {
      const response = await fetch('/api/copilot/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: finalTranscripts.slice(-6).map((t) => t.text),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect to copilot stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                accumulated += data.text;
                setCopilotAnswer((prev) =>
                  prev ? { ...prev, answer: accumulated, isStreaming: true } : null
                );
              }
              if (data.done) {
                setCopilotAnswer((prev) =>
                  prev ? { ...prev, isStreaming: false } : null
                );
              }
            } catch {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Copilot streaming error:', err);
      setCopilotAnswer((prev) =>
        prev
          ? {
              ...prev,
              answer:
                "💡 **Key Talking Points:**\n• **Core Strategy:** State the problem, your architectural trade-offs, and final result.\n• **STAR Method:** Highlight your direct technical leadership and quantifiable impact.\n• **Deepgram & .NET:** Explain how 16kHz PCM streaming achieves sub-100ms real-time latency.",
              isStreaming: false,
            }
          : null
      );
    }
  };

  // Start Interview Pipeline
  const handleStartInterview = async () => {
    if (isInterviewActive) return;

    try {
      setIsInterviewActive(true);
      setCurrentInterim('');

      if (settings.deepgramApiKey) {
        // Real Deepgram Nova-3 WebSocket Connection
        await deepgramClientRef.current?.connect(settings.deepgramApiKey, {
          model: settings.model,
          language: settings.language,
          interimResults: settings.interimResults,
          smartFormatting: settings.smartFormatting,
          endpointingMs: settings.endpointingMs,
        });

        // Start real microphone capture
        await audioCaptureRef.current?.start(selectedDeviceId);
        setStatus('connected');
      } else {
        // No Deepgram key entered yet: Start microphone capture for VU meter & run demo simulation
        await audioCaptureRef.current?.start(selectedDeviceId);
        setStatus('connected');
        handleSimulateSpeechSequence();
      }

      setIsOverlayOpen(true);
    } catch (err: any) {
      console.error('Start interview failed:', err);
      setStatus('error');
      setIsInterviewActive(false);
      audioCaptureRef.current?.stop();
    }
  };

  // Stop Interview Pipeline
  const handleStopInterview = () => {
    setIsInterviewActive(false);
    setStatus('disconnected');
    setAudioVolume(0);
    audioCaptureRef.current?.stop();
    deepgramClientRef.current?.disconnect();
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsSimulating(false);
  };

  // Realistic Interview Speech Simulator (tests interim and final events)
  const handleSimulateSpeechSequence = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    const simulationWords = [
      "Can", "you", "tell", "me", "about", "a", "time", "you", "optimized", "a", "low-latency", "system?"
    ];

    let currentIdx = 0;
    let accumulated = '';

    const timer = window.setInterval(() => {
      if (currentIdx < simulationWords.length) {
        accumulated += (currentIdx === 0 ? '' : ' ') + simulationWords[currentIdx];
        setCurrentInterim(accumulated);
        currentIdx++;
      } else {
        clearInterval(timer);
        simulationTimerRef.current = null;
        setCurrentInterim('');
        const evt: TranscriptEvent = {
          text: accumulated,
          isFinal: true,
          speechFinal: true,
          confidence: 0.98,
          timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setFinalTranscripts((prev) => [...prev, evt]);
        setIsSimulating(false);
        checkForQuestionAndTriggerCopilot(accumulated);
      }
    }, 180);

    simulationTimerRef.current = timer;
  };

  const handleTestDeepgramKey = async (key: string) => {
    try {
      const res = await fetch('/api/deepgram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="px-6 py-3.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20">
            MAUI
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight">AI Interview Assistant</span>
            <span className="hidden sm:inline-block ml-2 text-xs text-slate-400">· Windows-First STT Overlay</span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveView('assistant')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeView === 'assistant'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={13} />
            <span>Live Assistant &amp; Overlay</span>
          </button>

          <button
            onClick={() => setActiveView('code')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeView === 'code'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal size={13} />
            <span>.NET 8 MAUI Project Files</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 rounded-lg transition-colors"
            title="Settings"
          >
            <SettingsIcon size={16} />
          </button>
        </div>
      </header>

      {/* Main Workspace Canvas */}
      <main className="flex-1 p-6 flex flex-col items-center justify-start relative overflow-hidden">
        {activeView === 'assistant' ? (
          <div className="w-full flex flex-col items-center gap-6">
            {/* Windows Main Application Window */}
            <MainWindow
              isInterviewActive={isInterviewActive}
              status={status}
              onStart={handleStartInterview}
              onStop={handleStopInterview}
              onToggleOverlay={() => setIsOverlayOpen(!isOverlayOpen)}
              isOverlayOpen={isOverlayOpen}
              onOpenSettings={() => setIsSettingsOpen(true)}
              settings={settings}
              audioDevices={audioDevices}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={setSelectedDeviceId}
              audioVolume={audioVolume}
              onSimulateSpeech={handleSimulateSpeechSequence}
              isSimulating={isSimulating}
              onOpenCodeExplorer={() => setActiveView('code')}
            />

            {/* Architecture Flow Explanation Banner */}
            <div className="w-full max-w-3xl p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-mono text-purple-400 font-bold">Pipeline:</span>
                <span>Microphone (16kHz PCM) → Deepgram Nova-3 (WebSocket) → Interim/Final → Floating Overlay &amp; LLM Copilot</span>
              </div>
              <button
                onClick={() => setActiveView('code')}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium whitespace-nowrap"
              >
                <span>Inspect C# Implementation</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        ) : (
          <MauiCodeExplorer />
        )}

        {/* Floating Always-On-Top Overlay Window */}
        <FloatingOverlay
          isOpen={isOverlayOpen}
          onClose={() => setIsOverlayOpen(false)}
          status={status}
          currentInterim={currentInterim}
          finalTranscripts={finalTranscripts}
          copilotAnswer={copilotAnswer}
          onClear={() => {
            setFinalTranscripts([]);
            setCurrentInterim('');
            setCopilotAnswer(null);
          }}
          opacity={settings.overlayOpacity}
          onOpacityChange={(op) => saveSettings({ ...settings, overlayOpacity: op })}
          fontSize={settings.overlayFontSize}
          onFontSizeChange={(fs) => saveSettings({ ...settings, overlayFontSize: fs })}
          onTriggerCopilot={handleTriggerCopilot}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={saveSettings}
        onTestDeepgramKey={handleTestDeepgramKey}
      />
    </div>
  );
}
