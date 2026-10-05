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
  Volume2,
  Download,
  Sun,
  Moon
} from 'lucide-react';
import { 
  TranscriptEvent, 
  TranscriptParagraph,
  AppSettings, 
  ConnectionState, 
  AudioDevice, 
  CopilotAnswer,
  LLMSessionMetrics
} from './types';
import { BrowserAudioCapture } from './services/audioCapture';
import { DeepgramLiveClient } from './services/deepgramLive';
import { ReactiveTranscriptStore } from './services/transcriptStore';
import { ClientLLMRequestScheduler } from './services/llmScheduler';
import { MainWindow } from './components/MainWindow';
import { FloatingOverlay } from './components/FloatingOverlay';
import { SettingsModal } from './components/SettingsModal';
import { MauiCodeExplorer } from './components/MauiCodeExplorer';

const DEFAULT_SETTINGS: AppSettings = {
  // STT
  deepgramApiKey: '',
  provider: 'Deepgram',
  model: 'nova-3',
  language: 'en',
  interimResults: true,
  smartFormatting: true,
  endpointingMs: 300,

  // Audio
  selectedDeviceId: 'default',
  captureMode: 'Microphone',

  // Overlay & Appearance (Default: Light & Translucent as requested)
  overlayOpacity: 0.88,
  overlayFontSize: 15,
  alwaysOnTop: true,
  autoScrollToBottom: true,
  theme: 'light',

  // LLM Engine
  llmProvider: 'DeepSeek',
  llmModel: 'deepseek-chat',
  llmApiKey: '',
  llmTriggerMode: 'Automatic',
  llmDebounceMs: 500,
  llmMinTriggerLength: 20,
  llmMaxRequestsPerMinute: 10,
  llmMinTimeBetweenRequestsMs: 2000,
  llmMaxConcurrentRequests: 1,
  llmMaxContextTokens: 2000,
  llmMaxOutputTokens: 150,
  llmTemperature: 0.3,
  llmAnswerStyle: 'Natural',

  // Candidate Profile
  candidateName: '',
  candidateRole: 'Senior Backend Engineer',
  candidateExperience: 'Senior Software Engineer (5+ years)',
  candidateSkills: '.NET, C#, Distributed Systems, WebSockets, Azure',
  candidateProjects: 'Low-latency streaming architecture, real-time audio pipeline',

  // Cost Controls
  llmMaxSessionRequests: 50,
  llmStopWhenLimitReached: false,
  llmMaxEstimatedCostUsd: 1.00,

  // Privacy
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
  const [paragraphs, setParagraphs] = useState<TranscriptParagraph[]>([]);
  const [copilotAnswer, setCopilotAnswer] = useState<CopilotAnswer | null>(null);
  const [audioVolume, setAudioVolume] = useState(0);
  const [isOverlayOpen, setIsOverlayOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);

  // Settings State with LocalStorage Persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('interview_assistant_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed, theme: parsed.theme || 'light' };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');

  // Services References
  const audioCaptureRef = useRef<BrowserAudioCapture | null>(null);
  const deepgramClientRef = useRef<DeepgramLiveClient | null>(null);
  const transcriptStoreRef = useRef<ReactiveTranscriptStore>(new ReactiveTranscriptStore());
  const llmSchedulerRef = useRef<ClientLLMRequestScheduler>(new ClientLLMRequestScheduler());
  const simulationTimersRef = useRef<number[]>([]);

  // LLM Metrics state for UI
  const [metrics, setMetrics] = useState<LLMSessionMetrics>(llmSchedulerRef.current.metrics);

  const isLight = settings.theme === 'light';

  // Initialize Audio, Store, Scheduler & Enumerate Devices
  useEffect(() => {
    const audioCapture = new BrowserAudioCapture();
    const deepgramClient = new DeepgramLiveClient();
    const store = transcriptStoreRef.current;
    const scheduler = llmSchedulerRef.current;

    audioCaptureRef.current = audioCapture;
    deepgramClientRef.current = deepgramClient;

    // Subscribe to reactive store changes (automatic paragraph grouping)
    const unsubscribeStore = store.subscribe(() => {
      setCurrentInterim(store.getInterim());
      setFinalTranscripts(store.getFinalSegments());
      setParagraphs(store.getParagraphs());
    });

    // Subscribe to LLM Scheduler metrics
    const unsubscribeScheduler = scheduler.subscribe(() => {
      setMetrics({ ...scheduler.metrics });
    });

    // Hook up audio chunk forwarder to Deepgram WebSocket
    audioCapture.onChunk((chunk) => {
      deepgramClient.sendAudio(chunk);
    });

    // Hook up audio volume meter
    audioCapture.onVolume((vol) => {
      setAudioVolume(vol);
    });

    // Hook up Deepgram transcripts into reactive store & scheduler
    deepgramClient.onTranscript((evt) => {
      if (evt.isFinal || evt.speechFinal) {
        store.addFinal(evt);
        checkForQuestionAndTriggerCopilot(evt.text);
      } else {
        store.updateInterim(evt.text);
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
      unsubscribeStore();
      unsubscribeScheduler();
      simulationTimersRef.current.forEach((t) => clearTimeout(t));
      scheduler.cancelActive();
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

  // Toggle Theme
  const handleToggleTheme = () => {
    saveSettings({
      ...settings,
      theme: settings.theme === 'dark' ? 'light' : 'dark',
    });
  };

  // Download transcript handler
  const handleDownloadTranscript = () => {
    const success = transcriptStoreRef.current.downloadTranscript();
    if (success) {
      setDownloadNotification('Transcript exported successfully as .txt file');
      setTimeout(() => setDownloadNotification(null), 3500);
    }
  };

  // Toggle Auto-scroll
  const handleToggleAutoScroll = () => {
    saveSettings({
      ...settings,
      autoScrollToBottom: settings.autoScrollToBottom === false,
    });
  };

  // Question Detector & Copilot Trigger (Enforces LLM Scheduler - Section 13 & 14)
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
      handleTriggerCopilot(clean, 'QuestionDetection');
    }
  };

  const handleTriggerCopilot = async (
    question: string, 
    triggerSource: 'Automatic' | 'SpeechFinal' | 'QuestionDetection' | 'Debounced' | 'Manual' = 'Manual'
  ) => {
    const contextLines = paragraphs.slice(-3).map((p) => p.text);
    await llmSchedulerRef.current.scheduleTrigger(
      question,
      contextLines,
      settings,
      triggerSource,
      (answer) => setCopilotAnswer(answer)
    );
  };

  // Start Interview Pipeline
  const handleStartInterview = async () => {
    if (isInterviewActive) return;

    try {
      setIsInterviewActive(true);

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
    llmSchedulerRef.current.cancelActive();
    simulationTimersRef.current.forEach((t) => clearTimeout(t));
    simulationTimersRef.current = [];
    setIsSimulating(false);
  };

  // Realistic Multi-Turn Speech Simulator showing consecutive segment paragraph grouping
  const handleSimulateSpeechSequence = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    const store = transcriptStoreRef.current;

    const part1Words = ["I've", "been", "working", "with", "distributed", "systems", "and", ".NET", "for", "several", "years."];
    const part2Words = ["Recently,", "I", "focused", "heavily", "on", "low-latency", "WebSocket", "speech", "streaming", "and", "MVVM", "architecture."];
    const questionWords = ["Can", "you", "explain", "how", "you", "minimize", "audio", "buffer", "latency", "in", "Windows?"];

    const runStreamWords = (words: string[], delayBetweenWords: number, onComplete: () => void) => {
      let currentIdx = 0;
      let acc = '';

      const interval = window.setInterval(() => {
        if (currentIdx < words.length) {
          acc += (currentIdx === 0 ? '' : ' ') + words[currentIdx];
          store.updateInterim(acc);
          currentIdx++;
        } else {
          clearInterval(interval);
          const fullText = acc;
          store.addFinal({
            text: fullText,
            isFinal: true,
            speechFinal: true,
            confidence: 0.97,
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
            timestampMs: Date.now(),
          });
          onComplete();
        }
      }, delayBetweenWords);

      simulationTimersRef.current.push(interval);
    };

    runStreamWords(part1Words, 140, () => {
      const t1 = window.setTimeout(() => {
        runStreamWords(part2Words, 140, () => {
          const t2 = window.setTimeout(() => {
            runStreamWords(questionWords, 150, () => {
              setIsSimulating(false);
              checkForQuestionAndTriggerCopilot(questionWords.join(' '));
            });
          }, 1800);
          simulationTimersRef.current.push(t2);
        });
      }, 1200);
      simulationTimersRef.current.push(t1);
    });
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
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 relative ${
      isLight
        ? 'bg-slate-100 text-slate-800 bg-gradient-to-br from-slate-100 via-sky-50/50 to-indigo-50/30'
        : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Toast Notification */}
      {downloadNotification && (
        <div className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-lg border text-xs font-medium shadow-xl flex items-center gap-2 animate-bounce ${
          isLight
            ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
            : 'bg-emerald-950 border-emerald-800 text-emerald-200'
        }`}>
          <Download size={14} className={isLight ? 'text-emerald-700' : 'text-emerald-400'} />
          <span>{downloadNotification}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className={`px-6 py-3.5 border-b flex items-center justify-between sticky top-0 z-40 backdrop-blur-md transition-colors ${
        isLight
          ? 'bg-white/75 border-slate-200/80 text-slate-800 shadow-sm'
          : 'bg-slate-950/90 border-slate-800/80 text-slate-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20">
            MAUI
          </div>
          <div>
            <span className={`text-sm font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              AI Interview Assistant
            </span>
            <span className={`hidden sm:inline-block ml-2 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              · Windows-First STT Overlay (شفاف و روشن)
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className={`flex items-center gap-1 p-1 rounded-lg border text-xs ${
          isLight ? 'bg-slate-100/90 border-slate-200 shadow-inner' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <button
            onClick={() => setActiveView('assistant')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeView === 'assistant'
                ? 'bg-blue-600 text-white shadow-sm'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
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
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal size={13} />
            <span>.NET 8 MAUI Project Files</span>
          </button>
        </div>

        {/* Quick Actions & Theme Switcher */}
        <div className="flex items-center gap-2">
          {paragraphs.length > 0 && (
            <button
              onClick={handleDownloadTranscript}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
              }`}
              title="Download Transcript to text file"
            >
              <Download size={13} />
              <span className="hidden md:inline">Download Transcript</span>
            </button>
          )}

          {/* Quick Theme Toggle Button */}
          <button
            onClick={handleToggleTheme}
            className={`p-2 rounded-lg transition-colors border ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-amber-600 border-slate-200 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800'
            }`}
            title={isLight ? 'Switch to Dark Mode (تغییر به تم تاریک)' : 'Switch to Light Translucent Mode (تغییر به تم روشن و شفاف)'}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2 rounded-lg transition-colors border ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
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
              onDownloadTranscript={handleDownloadTranscript}
              hasTranscripts={paragraphs.length > 0}
              paragraphCount={paragraphs.length}
              autoScrollToBottom={settings.autoScrollToBottom !== false}
              onToggleAutoScroll={handleToggleAutoScroll}
            />

            {/* Architecture Flow Explanation Banner */}
            <div className={`w-full max-w-3xl p-4 rounded-xl border text-xs flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
              isLight
                ? 'bg-white/70 backdrop-blur-md border-slate-200/80 text-slate-600 shadow-sm'
                : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>Pipeline:</span>
                <span>Microphone (16kHz PCM) → Deepgram Nova-3 (WebSocket) → Auto-Grouped Paragraphs → Overlay &amp; LLM Copilot</span>
              </div>
              <button
                onClick={() => setActiveView('code')}
                className={`flex items-center gap-1 font-medium whitespace-nowrap ${
                  isLight ? 'text-blue-600 hover:text-blue-800' : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                <span>Inspect C# Implementation</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        ) : (
          <MauiCodeExplorer theme={settings.theme} />
        )}

        {/* Floating Always-On-Top Overlay Window */}
        <FloatingOverlay
          isOpen={isOverlayOpen}
          onClose={() => setIsOverlayOpen(false)}
          status={status}
          currentInterim={currentInterim}
          finalTranscripts={finalTranscripts}
          paragraphs={paragraphs}
          copilotAnswer={copilotAnswer}
          onClear={() => {
            transcriptStoreRef.current.clear();
            setCopilotAnswer(null);
          }}
          opacity={settings.overlayOpacity}
          onOpacityChange={(op) => saveSettings({ ...settings, overlayOpacity: op })}
          fontSize={settings.overlayFontSize}
          onFontSizeChange={(fs) => saveSettings({ ...settings, overlayFontSize: fs })}
          onTriggerCopilot={(q) => handleTriggerCopilot(q, 'Manual')}
          onDownloadTranscript={handleDownloadTranscript}
          autoScrollToBottom={settings.autoScrollToBottom !== false}
          onToggleAutoScroll={handleToggleAutoScroll}
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
        />
      </main>

      {/* Settings Modal with Full LLM & Metrics Controls */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={saveSettings}
        onTestDeepgramKey={handleTestDeepgramKey}
        onDownloadTranscript={handleDownloadTranscript}
        hasTranscripts={paragraphs.length > 0}
        paragraphCount={paragraphs.length}
        sessionMetrics={metrics}
        onResetMetrics={() => llmSchedulerRef.current.resetMetrics()}
      />
    </div>
  );
}
