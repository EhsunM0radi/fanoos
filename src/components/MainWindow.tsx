import React from 'react';
import { 
  Mic, 
  MicOff, 
  Settings as SettingsIcon, 
  Layers, 
  Play, 
  Square, 
  Sparkles, 
  Volume2, 
  Radio, 
  ShieldCheck, 
  Cpu, 
  Terminal,
  ExternalLink,
  Download,
  FileText
} from 'lucide-react';
import { AppSettings, ConnectionState, AudioDevice } from '../types';

interface MainWindowProps {
  isInterviewActive: boolean;
  status: ConnectionState;
  onStart: () => void;
  onStop: () => void;
  onToggleOverlay: () => void;
  isOverlayOpen: boolean;
  onOpenSettings: () => void;
  settings: AppSettings;
  audioDevices: AudioDevice[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  audioVolume: number;
  onSimulateSpeech: () => void;
  isSimulating: boolean;
  onOpenCodeExplorer: () => void;
  onDownloadTranscript: () => void;
  hasTranscripts: boolean;
  paragraphCount: number;
  autoScrollToBottom: boolean;
  onToggleAutoScroll: () => void;
}

export const MainWindow: React.FC<MainWindowProps> = ({
  isInterviewActive,
  status,
  onStart,
  onStop,
  onToggleOverlay,
  isOverlayOpen,
  onOpenSettings,
  settings,
  audioDevices,
  selectedDeviceId,
  onSelectDevice,
  audioVolume,
  onSimulateSpeech,
  isSimulating,
  onOpenCodeExplorer,
  onDownloadTranscript,
  hasTranscripts,
  paragraphCount,
  autoScrollToBottom,
  onToggleAutoScroll,
}) => {
  return (
    <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
      {/* Native Windows Title Bar Simulation */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            AI
          </div>
          <span className="text-xs font-semibold text-slate-300 tracking-wide">
            AI Interview Assistant (.NET MAUI &amp; Nova-3)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCodeExplorer}
            className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-2 py-1 rounded flex items-center gap-1.5 transition-colors"
          >
            <Terminal size={12} className="text-blue-400" />
            <span>.NET Source Files</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded transition-colors"
            title="Settings"
          >
            <SettingsIcon size={14} />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 space-y-6">
        {/* Header & Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Interview Assistant</h1>
            <p className="text-xs text-slate-400 mt-1">
              Low-latency real-time speech streaming with floating overlay &amp; copilot
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  status === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : status === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : status === 'error'
                    ? 'bg-red-500'
                    : 'bg-slate-500'
                }`}
              />
              <span className="font-semibold capitalize text-slate-300">
                {status === 'connected' ? '● Connected / Listening' : status === 'connecting' ? '● Connecting...' : status === 'error' ? '● Error' : '○ Stopped'}
              </span>
            </div>

            <button
              onClick={onToggleAutoScroll}
              title={autoScrollToBottom ? 'Auto-scroll is ON: locked to latest speech' : 'Auto-scroll is OFF: review freely'}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all border ${
                autoScrollToBottom
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoScrollToBottom ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{autoScrollToBottom ? 'Auto-scroll ON' : 'Auto-scroll OFF'}</span>
            </button>

            <button
              onClick={onToggleOverlay}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all ${
                isOverlayOpen
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Layers size={13} />
              <span>{isOverlayOpen ? 'Overlay Open' : 'Open Overlay'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Speech Engine Configuration Card */}
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Radio size={14} />
                <span>Speech Provider</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 font-mono">
                Real-Time STT
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Provider:</span>
                <span className="font-semibold text-slate-200">{settings.provider}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Model:</span>
                <span className="font-mono text-purple-300 font-medium">Nova-3 (English)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Interim Results:</span>
                <span className="text-emerald-400 font-medium">Enabled (Instant)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Smart Formatting:</span>
                <span className="text-slate-300">Enabled</span>
              </div>
            </div>
          </div>

          {/* Audio Input Configuration Card */}
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Mic size={14} />
                <span>Audio Capture</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">
                16kHz PCM
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Microphone Input:</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => onSelectDevice(e.target.value)}
                  disabled={isInterviewActive}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="default">Default System Microphone</option>
                  {audioDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || `Microphone ${d.id.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Capture Mode:</span>
                <span className="text-slate-200 font-medium">{settings.captureMode}</span>
              </div>

              {/* Real-time Audio Level Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Input Signal:</span>
                  <span className="font-mono text-slate-500">{isInterviewActive ? `${audioVolume}%` : 'Off'}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      audioVolume > 70 ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${isInterviewActive ? audioVolume : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            {!isInterviewActive ? (
              <button
                onClick={onStart}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
              >
                <Play size={14} className="fill-current" />
                <span>Start Interview</span>
              </button>
            ) : (
              <button
                onClick={onStop}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all animate-pulse"
              >
                <Square size={14} className="fill-current" />
                <span>Stop Interview</span>
              </button>
            )}

            {/* Quick Simulation Button */}
            <button
              onClick={onSimulateSpeech}
              disabled={isSimulating}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 border border-slate-700 transition-all disabled:opacity-50"
              title="Test realistic interview speech without audio input"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>{isSimulating ? 'Simulating...' : 'Test Speech Sample'}</span>
            </button>

            {/* Download Transcript Button */}
            <button
              onClick={onDownloadTranscript}
              disabled={!hasTranscripts}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 border transition-all ${
                hasTranscripts
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950 cursor-pointer'
                  : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
              }`}
              title={hasTranscripts ? `Export session transcript (${paragraphCount} paragraphs)` : 'No transcript recorded yet'}
            >
              <Download size={13} className={hasTranscripts ? 'text-emerald-400' : 'text-slate-500'} />
              <span>
                Download Transcript
                {hasTranscripts && <span className="ml-1 text-[11px] opacity-80">({paragraphCount})</span>}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-emerald-500/80" />
            <span>Privacy Active: No audio or transcripts saved to disk</span>
          </div>
        </div>
      </div>
    </div>
  );
};
