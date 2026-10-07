import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Key, 
  Shield, 
  Radio, 
  Layers, 
  Mic, 
  Sliders, 
  Download, 
  FileText,
  Sparkles,
  Zap,
  DollarSign,
  User,
  Clock,
  RotateCcw,
  Sun,
  Moon,
  Users,
  Briefcase,
  Target,
  MessageSquare,
  Handshake,
  ClipboardList,
  Eye,
  EyeOff
} from 'lucide-react';
import { AppSettings, LLMSessionMetrics, CopilotLens } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onTestDeepgramKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  onDownloadTranscript: () => void;
  hasTranscripts: boolean;
  paragraphCount: number;
  sessionMetrics?: LLMSessionMetrics;
  onResetMetrics?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onTestDeepgramKey,
  onDownloadTranscript,
  hasTranscripts,
  paragraphCount,
  sessionMetrics,
  onResetMetrics,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'meeting' | 'llm' | 'speech' | 'audio' | 'overlay' | 'privacy'>('meeting');
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

  // Meeting Preset Applier
  const handleApplyPreset = (preset: AppSettings['meetingType']) => {
    switch (preset) {
      case 'job_interview':
        setFormData({
          ...formData,
          meetingType: 'job_interview',
          myRole: formData.candidateRole || 'Senior Backend Engineer',
          counterpartRole: 'CTO / Technical Hiring Manager',
          meetingGoal: 'Demonstrate deep architecture knowledge, leadership, and STAR methodology',
          activeCopilotLens: 'WhatShouldISay',
        });
        break;
      case 'client_meeting':
        setFormData({
          ...formData,
          meetingType: 'client_meeting',
          myRole: 'Lead Technical Consultant',
          counterpartRole: 'Client Project Sponsor / VP of Product',
          meetingGoal: 'Scope requirements, validate feasibility, and build trust in delivery timelines',
          activeCopilotLens: 'FollowUp',
        });
        break;
      case 'negotiation':
        setFormData({
          ...formData,
          meetingType: 'negotiation',
          myRole: 'Principal Contractor / Specialist',
          counterpartRole: 'Procurement Director / Client Negotiator',
          meetingGoal: 'Defend rate and scope boundaries, address cost pushbacks, and reach mutual sign-off',
          activeCopilotLens: 'Negotiation',
        });
        break;
      case 'architecture_review':
        setFormData({
          ...formData,
          meetingType: 'architecture_review',
          myRole: 'System Architect',
          counterpartRole: 'Peer Engineering Leads / Security Reviewer',
          meetingGoal: 'Review microservice decoupling, throughput bottlenecks, and disaster recovery',
          activeCopilotLens: 'TechnicalAdvice',
        });
        break;
      case 'team_sync':
        setFormData({
          ...formData,
          meetingType: 'team_sync',
          myRole: 'Tech Lead',
          counterpartRole: 'Product Manager & Team Engineers',
          meetingGoal: 'Unblock sprint dependencies, agree on action items, and maintain alignment',
          activeCopilotLens: 'Summary',
        });
        break;
      case 'custom':
      default:
        setFormData({
          ...formData,
          meetingType: 'custom',
        });
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]">
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
        <div className="flex items-center border-b border-slate-800 px-4 bg-slate-950/40 text-xs overflow-x-auto">
          {/* TAB: Meeting & Roles (Premier Tab) */}
          <button
            onClick={() => setActiveTab('meeting')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'meeting'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={13} className="text-blue-400" />
            <span>Meeting &amp; Roles</span>
          </button>

          <button
            onClick={() => setActiveTab('llm')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'llm'
                ? 'border-purple-500 text-purple-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={13} className="text-purple-400" />
            <span>LLM Copilot</span>
          </button>

          <button
            onClick={() => setActiveTab('speech')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'speech'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={13} />
            <span>Speech (STT)</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
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
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'overlay'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={13} />
            <span>Overlay &amp; Display</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
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
          {/* TAB: MEETING & ROLES (General Meeting Paradigm) */}
          {activeTab === 'meeting' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/40 text-blue-200 text-[11px] leading-relaxed">
                🤝 <strong>Flexible Meeting Copilot:</strong> Define your role, the other party's role, and the meeting goal. The AI adapts all live follow-ups, advice, and spoken responses to your exact situation.
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Meeting Type Presets (الگوهای آماده جلسه):</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('job_interview')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      formData.meetingType === 'job_interview'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold block text-xs">Technical Interview</span>
                    <span className="text-[10px] text-slate-500">مصاحبه شغلی فنی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('client_meeting')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      formData.meetingType === 'client_meeting'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold block text-xs">Client Pitch / Scope</span>
                    <span className="text-[10px] text-slate-500">جلسه با کارفرما یا مشتری</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('negotiation')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      formData.meetingType === 'negotiation'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold block text-xs">Contract Negotiation</span>
                    <span className="text-[10px] text-slate-500">مذاکره قرارداد یا قیمت</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('architecture_review')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      formData.meetingType === 'architecture_review'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold block text-xs">Architecture Review</span>
                    <span className="text-[10px] text-slate-500">بررسی معماری سیستم</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('team_sync')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      formData.meetingType === 'team_sync'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold block text-xs">Team Sync / 1-on-1</span>
                    <span className="text-[10px] text-slate-500">جلسه تیمی و مدیر محصول</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('custom')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      formData.meetingType === 'custom'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold block text-xs">Custom Meeting</span>
                    <span className="text-[10px] text-slate-500">جلسه سفارشی دلخواه</span>
                  </button>
                </div>
              </div>

              {/* Roles Inputs */}
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <Briefcase size={13} className="text-blue-400" />
                  <span>Role Definitions (تعریف نقش‌ها)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">My Role (نقش من در جلسه):</label>
                    <input
                      type="text"
                      value={formData.myRole}
                      onChange={(e) => setFormData({ ...formData, myRole: e.target.value })}
                      placeholder="e.g. Senior Backend Dev, Technical Lead, Freelancer"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Counterpart's Role (نقش طرف مقابل):</label>
                    <input
                      type="text"
                      value={formData.counterpartRole}
                      onChange={(e) => setFormData({ ...formData, counterpartRole: e.target.value })}
                      placeholder="e.g. CTO, Client Sponsor, HR Director, Product Owner"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">Meeting Goal &amp; Context (هدف و موضوع کلیدی جلسه):</label>
                  <input
                    type="text"
                    value={formData.meetingGoal}
                    onChange={(e) => setFormData({ ...formData, meetingGoal: e.target.value })}
                    placeholder="e.g. Agree on architecture deliverables, negotiate contract scope, pass interview"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Default Copilot Lens & Transcript Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Default Copilot Lens (حالت پیش‌فرض دستیار):</label>
                  <select
                    value={formData.activeCopilotLens}
                    onChange={(e) => setFormData({ ...formData, activeCopilotLens: e.target.value as CopilotLens })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="WhatShouldISay">💬 What Should I Say? (چی بگم الان؟)</option>
                    <option value="FollowUp">🎯 Follow-Up Questions (سوالات استراتژیک)</option>
                    <option value="TechnicalAdvice">⚡ Technical Advice (راهنمایی فنی)</option>
                    <option value="Negotiation">🤝 Negotiation &amp; Objection (مذاکره و دیپلماسی)</option>
                    <option value="Summary">📋 Action Items (جمع‌بندی و تسک‌ها)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Transcript View in Overlay (نمایش رونوشت):</label>
                  <select
                    value={formData.transcriptDisplayMode}
                    onChange={(e) => setFormData({ ...formData, transcriptDisplayMode: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="compact">Discreet Subtitle (فقط تیکه آخر، ظریف و کم‌دید - پیش‌فرض)</option>
                    <option value="full">Full Transcript History (تاریخچه کامل قابل اسکرول)</option>
                    <option value="hidden">Hidden (مخفی کامل - فقط نمایش راهنمایی‌های هوش مصنوعی)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SPEECH (STT) */}
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
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {isTesting ? 'Verifying...' : 'Test Connection'}
                  </button>
                </div>
                {testResult && (
                  <p className={`text-[11px] mt-1.5 ${testResult.includes('successful') ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {testResult}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-300 block font-semibold">Model:</span>
                    <span className="text-[10px] text-slate-500">Ultra-low latency streaming model</span>
                  </div>
                  <span className="font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                    Nova-3 (English)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-300 block font-semibold">Interim Results:</span>
                    <span className="text-[10px] text-slate-500">Live word updates before sentence commit</span>
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
                    <span className="text-slate-300 block font-semibold">Smart Formatting:</span>
                    <span className="text-[10px] text-slate-500">Automatic capitalization, punctuation, numbers</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.smartFormatting}
                    onChange={(e) => setFormData({ ...formData, smartFormatting: e.target.checked })}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: LLM COPILOT */}
          {activeTab === 'llm' && (
            <div className="space-y-4">
              <div className="p-3 rounded bg-purple-950/40 border border-purple-800/40 text-purple-200 text-[11px] leading-relaxed">
                🤖 <strong>Controlled Event-Driven LLM Triggering:</strong> Enforces local rate limits, question boundary detection, debouncing, and bounded context windows.
              </div>

              {/* Provider & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">LLM Provider:</label>
                  <select
                    value={formData.llmProvider}
                    onChange={(e) => setFormData({ ...formData, llmProvider: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500 text-xs"
                  >
                    <option value="DeepSeek">DeepSeek</option>
                    <option value="Gemini">Gemini</option>
                    <option value="OpenAI">OpenAI</option>
                    <option value="OpenRouter">OpenRouter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Model Name:</label>
                  <input
                    type="text"
                    value={formData.llmModel}
                    onChange={(e) => setFormData({ ...formData, llmModel: e.target.value })}
                    placeholder="e.g. deepseek-chat, gemini-3.8-flash"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Trigger Mode & Debounce */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Trigger Mode:</label>
                  <select
                    value={formData.llmTriggerMode}
                    onChange={(e) => setFormData({ ...formData, llmTriggerMode: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500 text-xs"
                  >
                    <option value="Automatic">Automatic (Recommended)</option>
                    <option value="SpeechFinal">Speech Final Only</option>
                    <option value="QuestionDetection">Question Detection Only</option>
                    <option value="Debounced">Debounced Silence</option>
                    <option value="Manual">Manual Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Debounce Delay:</label>
                  <select
                    value={formData.llmDebounceMs}
                    onChange={(e) => setFormData({ ...formData, llmDebounceMs: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500 text-xs"
                  >
                    <option value={250}>250 ms</option>
                    <option value={500}>500 ms (Default)</option>
                    <option value={750}>750 ms</option>
                    <option value={1000}>1000 ms</option>
                    <option value={1500}>1500 ms</option>
                    <option value={2000}>2000 ms</option>
                  </select>
                </div>
              </div>

              {/* Rate Limits & Token Limits */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-400" />
                  <span>Rate Limits &amp; Token Controls</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Max Req / Minute:</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.llmMaxRequestsPerMinute}
                      onChange={(e) => setFormData({ ...formData, llmMaxRequestsPerMinute: parseInt(e.target.value) || 10 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Min Interval (ms):</label>
                    <input
                      type="number"
                      step="500"
                      min="500"
                      max="10000"
                      value={formData.llmMinTimeBetweenRequestsMs}
                      onChange={(e) => setFormData({ ...formData, llmMinTimeBetweenRequestsMs: parseInt(e.target.value) || 2000 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Max Output Tokens:</label>
                    <input
                      type="number"
                      step="25"
                      min="50"
                      max="500"
                      value={formData.llmMaxOutputTokens}
                      onChange={(e) => setFormData({ ...formData, llmMaxOutputTokens: parseInt(e.target.value) || 150 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Answer Style:</label>
                    <select
                      value={formData.llmAnswerStyle}
                      onChange={(e) => setFormData({ ...formData, llmAnswerStyle: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    >
                      <option value="Concise">Concise (Bullet talking points)</option>
                      <option value="Natural">Natural (Conversational flow)</option>
                      <option value="Detailed">Detailed (Deep breakdown)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Max Context Tokens:</label>
                    <input
                      type="number"
                      step="500"
                      min="500"
                      max="8000"
                      value={formData.llmMaxContextTokens}
                      onChange={(e) => setFormData({ ...formData, llmMaxContextTokens: parseInt(e.target.value) || 2000 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Session Metrics & Cost */}
              {sessionMetrics && (
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign size={13} />
                      <span>Live Session Metrics</span>
                    </span>
                    {onResetMetrics && (
                      <button
                        onClick={onResetMetrics}
                        className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        <RotateCcw size={11} />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">LLM Requests</span>
                      <span className="text-xs font-bold text-slate-200 font-mono">{sessionMetrics.totalRequests}</span>
                    </div>

                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Avg TTFT</span>
                      <span className="text-xs font-bold text-sky-400 font-mono">
                        {sessionMetrics.averageTtftMs ? `${sessionMetrics.averageTtftMs} ms` : '—'}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Tokens (In/Out)</span>
                      <span className="text-xs font-bold text-purple-400 font-mono">
                        {sessionMetrics.totalInputTokens}/{sessionMetrics.totalOutputTokens}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Estimated Cost</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        ${sessionMetrics.estimatedCostUsd.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: AUDIO */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Audio Capture Mode:</label>
                <select
                  value={formData.captureMode}
                  onChange={(e) => setFormData({ ...formData, captureMode: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                >
                  <option value="Microphone">Microphone (Recommended for speaking)</option>
                  <option value="SystemAudio">System Audio (Loopback for other speaker)</option>
                  <option value="Combined">Combined (Microphone + System Audio)</option>
                </select>
              </div>

              <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-slate-300 font-semibold block">PCM Audio Specifications:</span>
                <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                  Sample Rate: 16,000 Hz · Channels: 1 (Mono) · Bit Depth: 16-bit Linear PCM · Chunk Size: ~100ms chunks (3200 bytes)
                </p>
              </div>
            </div>
          )}

          {/* TAB: OVERLAY & DISPLAY */}
          {activeTab === 'overlay' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-300 font-semibold">Overlay Opacity:</span>
                  <span className="font-mono text-purple-300 text-xs">{Math.round(formData.overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={formData.overlayOpacity}
                  onChange={(e) => setFormData({ ...formData, overlayOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-300 font-semibold">Overlay Font Size:</span>
                  <span className="font-mono text-purple-300 text-xs">{formData.overlayFontSize}px</span>
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

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-300 block font-semibold">Auto-scroll to bottom:</span>
                  <span className="text-[10px] text-slate-500">Keeps transcript display locked to latest speech</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoScrollToBottom !== false}
                  onChange={(e) => setFormData({ ...formData, autoScrollToBottom: e.target.checked })}
                  className="accent-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Theme & Appearance Selector */}
              <div className="pt-3 border-t border-slate-800">
                <label className="block text-slate-300 font-semibold mb-2">Theme &amp; Appearance (تم و ظاهر):</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: 'light' })}
                    className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                      formData.theme === 'light'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-400 mt-0.5">
                      <Sun size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-slate-200">Light (Translucent)</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">روشن و شفاف (Mica Acrylic)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: 'dark' })}
                    className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                      formData.theme === 'dark'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-400/20 text-indigo-400 mt-0.5">
                      <Moon size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-slate-200">Dark (Slate)</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">تاریک (Obsidian Mode)</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <div className="p-3 rounded bg-blue-950/40 border border-blue-800/40 text-blue-200 text-[11px] leading-relaxed">
                🛡️ <strong>Zero Data Retention Policy:</strong> Data is kept in transient memory and discarded immediately upon stopping.
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

              {/* Manual Export Option */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-slate-200 font-semibold block flex items-center gap-1.5">
                      <FileText size={13} className="text-blue-400" />
                      <span>Export Session Transcript</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {hasTranscripts
                        ? `${paragraphCount} grouped paragraph blocks ready to export.`
                        : 'No transcript recorded in the current session.'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onDownloadTranscript}
                    disabled={!hasTranscripts}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      hasTranscripts
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Download size={13} />
                    <span>Download .txt</span>
                  </button>
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
            <Check size={13} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
