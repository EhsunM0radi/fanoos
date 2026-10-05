import React, { useState } from 'react';
import { X, Check, Key, Shield, Radio, Layers, Mic, Sliders } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onTestDeepgramKey: (key: string) => Promise<{ success: boolean; error?: string }>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onTestDeepgramKey,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'speech' | 'audio' | 'overlay' | 'privacy'>('speech');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!formData.deepgramApiKey) {
      setTestResult('Please enter an API key first.');
      return;
    }
    setIsTesting(true);
    setTestResult('Verifying with Deepgram...');
    const res = await onTestDeepgramKey(formData.deepgramApiKey);
    setIsTesting(false);
    if (res.success) {
      setTestResult('Connection successful! Valid Deepgram Nova-3 API Key.');
    } else {
      setTestResult(`Failed: ${res.error || 'Invalid API Key'}`);
    }
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-blue-400" />
            <h2 className="text-sm font-bold text-slate-200">Application Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 px-4 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('speech')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'speech'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={13} />
            <span>Speech (Deepgram)</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audio'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic size={13} />
            <span>Audio</span>
          </button>

          <button
            onClick={() => setActiveTab('overlay')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'overlay'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={13} />
            <span>Overlay</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield size={13} />
            <span>Privacy</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'speech' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Key size={13} className="text-amber-400" />
                  <span>Deepgram API Key:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formData.deepgramApiKey}
                    onChange={(e) => setFormData({ ...formData, deepgramApiKey: e.target.value })}
                    placeholder="Enter Deepgram API Key..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                  <button
                    onClick={handleTestKey}
                    disabled={isTesting}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium disabled:opacity-50"
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                {testResult && (
                  <p className={`mt-1.5 text-[11px] ${testResult.includes('successful') ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {testResult}
                  </p>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave blank to use interactive Speech Simulation mode, or enter your Deepgram key for live real-time speech streaming.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Model:</span>
                  <span className="font-mono text-purple-300 font-semibold">nova-3</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Language:</span>
                  <span className="text-slate-300">English (en)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-300 block">Interim Results:</span>
                    <span className="text-[10px] text-slate-500">Stream words in real time before sentence ends</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.interimResults}
                    onChange={(e) => setFormData({ ...formData, interimResults: e.target.checked })}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-300 block">Smart Formatting:</span>
                    <span className="text-[10px] text-slate-500">Automatic capitalization, punctuation, numbers</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.smartFormatting}
                    onChange={(e) => setFormData({ ...formData, smartFormatting: e.target.checked })}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Endpointing (Silence ms):</span>
                  <input
                    type="number"
                    value={formData.endpointingMs}
                    onChange={(e) => setFormData({ ...formData, endpointingMs: parseInt(e.target.value) || 300 })}
                    className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-right font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Audio Capture Mode:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="captureMode"
                      value="Microphone"
                      checked={formData.captureMode === 'Microphone'}
                      onChange={() => setFormData({ ...formData, captureMode: 'Microphone' })}
                      className="accent-blue-500"
                    />
                    <div>
                      <span className="block text-slate-200 font-medium">Microphone (Candidate Voice)</span>
                      <span className="block text-[11px] text-slate-500">Standard low-latency MVP capture</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="captureMode"
                      value="SystemAudio"
                      checked={formData.captureMode === 'SystemAudio'}
                      onChange={() => setFormData({ ...formData, captureMode: 'SystemAudio' })}
                      className="accent-blue-500"
                    />
                    <div>
                      <span className="block text-slate-200 font-medium">System Audio (Interviewer Voice)</span>
                      <span className="block text-[11px] text-slate-500">Windows WASAPI Loopback Capture (P1)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="captureMode"
                      value="Combined"
                      checked={formData.captureMode === 'Combined'}
                      onChange={() => setFormData({ ...formData, captureMode: 'Combined' })}
                      className="accent-blue-500"
                    />
                    <div>
                      <span className="block text-slate-200 font-medium">Microphone + System Audio</span>
                      <span className="block text-[11px] text-slate-500">Captures both interviewer & candidate</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overlay' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">Default Opacity:</span>
                  <span className="font-mono text-slate-400">{Math.round(formData.overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={formData.overlayOpacity}
                  onChange={(e) => setFormData({ ...formData, overlayOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">Font Size:</span>
                  <span className="font-mono text-slate-400">{formData.overlayFontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  value={formData.overlayFontSize}
                  onChange={(e) => setFormData({ ...formData, overlayFontSize: parseInt(e.target.value) })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-300 block font-semibold">Always On Top:</span>
                  <span className="text-[10px] text-slate-500">Keep overlay above Zoom, Teams, or browser</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.alwaysOnTop}
                  onChange={(e) => setFormData({ ...formData, alwaysOnTop: e.target.checked })}
                  className="accent-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <div className="p-3 rounded bg-blue-950/40 border border-blue-800/40 text-blue-200 text-[11px] leading-relaxed">
                🛡️ <strong>Zero Data Retention Policy:</strong> By default, the application does not record or persist audio or transcripts to disk. Data is kept in transient memory and discarded immediately upon stopping.
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-300 block">Save Audio to Disk</span>
                    <span className="text-[10px] text-slate-500">Strictly OFF by default</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.saveAudio}
                    onChange={(e) => setFormData({ ...formData, saveAudio: e.target.checked })}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-300 block">Save Transcripts to Disk</span>
                    <span className="text-[10px] text-slate-500">Strictly OFF by default</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.saveTranscript}
                    onChange={(e) => setFormData({ ...formData, saveTranscript: e.target.checked })}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-300 block">Save Screenshots</span>
                    <span className="text-[10px] text-slate-500">Strictly OFF by default</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.saveScreenshots}
                    onChange={(e) => setFormData({ ...formData, saveScreenshots: e.target.checked })}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Check size={14} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
