import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Pin, 
  X, 
  Minus, 
  Plus, 
  Maximize2, 
  Sparkles, 
  Volume2, 
  Trash2,
  Download, 
  Search, 
  ChevronUp, 
  ChevronDown, 
  ArrowDownToLine,
  Sun, 
  Moon,
  MessageSquare,
  Target,
  Zap,
  Handshake,
  ClipboardList,
  Copy,
  Check,
  Eye,
  EyeOff,
  User,
  Users
} from 'lucide-react';
import { 
  TranscriptEvent, 
  TranscriptParagraph, 
  CopilotAnswer, 
  ConnectionState, 
  CopilotLens 
} from '../types';

interface FloatingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  status: ConnectionState;
  currentInterim: string;
  finalTranscripts: TranscriptEvent[];
  paragraphs: TranscriptParagraph[];
  copilotAnswer: CopilotAnswer | null;
  onClear: () => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  onTriggerCopilot: (question: string, lens?: CopilotLens) => void;
  onDownloadTranscript: () => void;
  autoScrollToBottom: boolean;
  onToggleAutoScroll?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  // Meeting Roles & Lenses
  myRole?: string;
  counterpartRole?: string;
  activeLens?: CopilotLens;
  onSelectLens?: (lens: CopilotLens) => void;
  transcriptDisplayMode?: 'compact' | 'full' | 'hidden';
  onToggleTranscriptMode?: () => void;
}

export const FloatingOverlay: React.FC<FloatingOverlayProps> = ({
  isOpen,
  onClose,
  status,
  currentInterim,
  finalTranscripts,
  paragraphs,
  copilotAnswer,
  onClear,
  opacity,
  onOpacityChange,
  fontSize,
  onFontSizeChange,
  onTriggerCopilot,
  onDownloadTranscript,
  autoScrollToBottom,
  onToggleAutoScroll,
  theme = 'light',
  onToggleTheme,
  myRole = 'Senior Specialist',
  counterpartRole = 'Interviewer / Client',
  activeLens = 'WhatShouldISay',
  onSelectLens,
  transcriptDisplayMode = 'compact',
  onToggleTranscriptMode,
}) => {
  const [position, setPosition] = useState({ x: 28, y: 84 });
  const [size, setSize] = useState({ width: 480, height: 420 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  // Local Keyword Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const paragraphRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  const isLight = theme === 'light';

  // Latest spoken snippet for discreet mode
  const latestSpokenSnippet = useMemo(() => {
    if (currentInterim) return currentInterim;
    if (paragraphs.length > 0) {
      const lastP = paragraphs[paragraphs.length - 1];
      return lastP.text;
    }
    return '';
  }, [currentInterim, paragraphs]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // Handle Resizing
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        const newW = Math.max(340, Math.min(900, resizeStart.w + (e.clientX - resizeStart.x)));
        const newH = Math.max(240, Math.min(800, resizeStart.h + (e.clientY - resizeStart.y)));
        setSize({ width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart]);

  // Handle Lens Selection & Instant Trigger
  const handleLensClick = (lens: CopilotLens) => {
    onSelectLens?.(lens);
    const questionText = latestSpokenSnippet || 'General meeting discussion';
    onTriggerCopilot(questionText, lens);
  };

  const handleCopyAnswer = () => {
    if (!copilotAnswer?.answer) return;
    navigator.clipboard.writeText(copilotAnswer.answer);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  // Filter Matching Paragraphs
  const matchingParagraphs = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return paragraphs.filter((p) => p.text.toLowerCase().includes(q));
  }, [searchQuery, paragraphs]);

  const handleNextMatch = () => {
    if (matchingParagraphs.length === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % matchingParagraphs.length);
  };

  const handlePrevMatch = () => {
    if (matchingParagraphs.length === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + matchingParagraphs.length) % matchingParagraphs.length);
  };

  const renderHighlightedText = (text: string, isCurrentMatch: boolean) => {
    if (!searchQuery.trim()) return text;
    try {
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
      return parts.map((part, i) => {
        if (part.toLowerCase() === searchQuery.toLowerCase().trim()) {
          return (
            <mark
              key={i}
              className={`rounded px-1 py-0.2 font-semibold ${
                isCurrentMatch
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500'
                  : 'bg-yellow-300/80 text-slate-900'
              }`}
            >
              {part}
            </mark>
          );
        }
        return part;
      });
    } catch {
      return text;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
        opacity: opacity,
      }}
      className={`fixed top-0 left-0 z-50 rounded-xl flex flex-col backdrop-blur-2xl shadow-2xl select-none overflow-hidden transition-opacity duration-150 ${
        isLight
          ? 'bg-white/85 border border-white/90 text-slate-800 shadow-slate-300/60 ring-1 ring-slate-900/5'
          : 'bg-slate-950/95 border border-slate-800/80 text-slate-100'
      }`}
    >
      {/* 1. Titlebar / Drag Handle with Meeting Roles */}
      <div
        onMouseDown={handleMouseDown}
        className={`px-3 py-2 border-b flex items-center justify-between cursor-move ${
          isLight
            ? 'bg-slate-50/85 border-slate-200/80 text-slate-700'
            : 'bg-slate-900/90 border-slate-800/80 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Status Indicator Pip */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : status === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            <span className={`text-[11px] font-semibold tracking-wide ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              {status === 'connected' ? 'Live Copilot' : 'Connecting'}
            </span>
          </div>

          {/* Meeting Role Pill */}
          <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border truncate max-w-[200px] ${
            isLight
              ? 'bg-white/90 border-slate-200 text-slate-600 shadow-xs'
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`} title={`You: ${myRole} ⟷ Other Party: ${counterpartRole}`}>
            <User size={10} className="text-blue-500 shrink-0" />
            <span className="truncate">{myRole}</span>
            <span className="opacity-40">⟷</span>
            <span className="truncate text-purple-500">{counterpartRole}</span>
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1 no-drag shrink-0">
          {/* Theme Quick Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className={`p-1 rounded transition-colors ${
                isLight
                  ? 'text-amber-600 hover:text-amber-700 hover:bg-slate-200/70'
                  : 'text-amber-300 hover:text-amber-200 hover:bg-slate-800'
              }`}
            >
              {isLight ? <Moon size={13} /> : <Sun size={13} />}
            </button>
          )}

          {/* Toggle Transcript View Mode */}
          {onToggleTranscriptMode && (
            <button
              onClick={onToggleTranscriptMode}
              title={
                transcriptDisplayMode === 'compact'
                  ? 'Current: Discreet subtitle (Click for full transcript history)'
                  : transcriptDisplayMode === 'full'
                  ? 'Current: Full transcript history (Click to hide transcript)'
                  : 'Current: Hidden transcript (Click for discreet subtitle)'
              }
              className={`p-1 rounded transition-colors flex items-center gap-0.5 text-[11px] ${
                transcriptDisplayMode === 'full'
                  ? isLight
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-blue-900/60 text-blue-300 border border-blue-700'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {transcriptDisplayMode === 'hidden' ? <EyeOff size={13} /> : <Eye size={13} />}
              <span className="text-[10px] hidden md:inline">
                {transcriptDisplayMode === 'compact' ? 'Discreet' : transcriptDisplayMode === 'full' ? 'Full' : 'Hidden'}
              </span>
            </button>
          )}

          {/* Font Size controls */}
          <button
            onClick={() => onFontSizeChange(Math.max(12, fontSize - 1))}
            title="Decrease Font Size"
            className={`p-1 rounded transition-colors ${
              isLight
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Minus size={13} />
          </button>
          <span className={`text-[10px] font-mono px-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {fontSize}px
          </span>
          <button
            onClick={() => onFontSizeChange(Math.min(22, fontSize + 1))}
            title="Increase Font Size"
            className={`p-1 rounded transition-colors ${
              isLight
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Plus size={13} />
          </button>

          <div className={`w-[1px] h-3 mx-0.5 ${isLight ? 'bg-slate-300' : 'bg-slate-800'}`} />

          {/* Minimize toggle */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Collapse'}
            className={`p-1 rounded transition-colors ${
              isLight
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Minus size={13} />
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            title="Close Overlay"
            className={`p-1 rounded transition-colors ml-0.5 ${
              isLight
                ? 'text-slate-500 hover:text-red-600 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
            }`}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* 2. Actionable Copilot Mode Selector (Buttons user requested: What should I say, Follow-ups, etc.) */}
          <div className={`px-2.5 py-1.5 border-b flex items-center gap-1.5 overflow-x-auto text-xs no-drag ${
            isLight
              ? 'bg-slate-50/70 border-slate-200/70'
              : 'bg-slate-900/60 border-slate-800/60'
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              Lens:
            </span>

            {/* Lens 1: What Should I Say? */}
            <button
              onClick={() => handleLensClick('WhatShouldISay')}
              title="Give me exact spoken phrasing to reply right now"
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                activeLens === 'WhatShouldISay'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <MessageSquare size={12} className={activeLens === 'WhatShouldISay' ? 'text-white' : 'text-blue-500'} />
              <span>What Should I Say?</span>
            </button>

            {/* Lens 2: Strategic Follow-Up */}
            <button
              onClick={() => handleLensClick('FollowUp')}
              title="Suggest high-impact follow-up questions to ask next"
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                activeLens === 'FollowUp'
                  ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-500'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Target size={12} className={activeLens === 'FollowUp' ? 'text-white' : 'text-purple-400'} />
              <span>Follow-Ups</span>
            </button>

            {/* Lens 3: Technical Advice */}
            <button
              onClick={() => handleLensClick('TechnicalAdvice')}
              title="Provide deep technical critique and architecture guidance"
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                activeLens === 'TechnicalAdvice'
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-500'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Zap size={12} className={activeLens === 'TechnicalAdvice' ? 'text-white' : 'text-amber-500'} />
              <span>Tech Advice</span>
            </button>

            {/* Lens 4: Negotiation & Objection */}
            <button
              onClick={() => handleLensClick('Negotiation')}
              title="Diplomatic phrasing, objection handling, and scope protection"
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                activeLens === 'Negotiation'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Handshake size={12} className={activeLens === 'Negotiation' ? 'text-white' : 'text-emerald-500'} />
              <span>Negotiation</span>
            </button>

            {/* Lens 5: Action Items */}
            <button
              onClick={() => handleLensClick('Summary')}
              title="Recap key commitments and immediate next steps"
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                activeLens === 'Summary'
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <ClipboardList size={12} className={activeLens === 'Summary' ? 'text-white' : 'text-indigo-400'} />
              <span>Action Items</span>
            </button>
          </div>

          {/* 3. Main Center Content: AI Copilot Guidance (Front & Center) */}
          <div
            ref={scrollRef}
            className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans select-text scroll-smooth"
            style={{ fontSize: `${fontSize}px` }}
          >
            {/* If Copilot has an answer */}
            {copilotAnswer ? (
              <div className={`p-3.5 rounded-xl border shadow-lg space-y-2.5 transition-all ${
                isLight
                  ? 'bg-white/95 border-purple-200/90 text-slate-800 shadow-purple-100/50'
                  : 'bg-gradient-to-b from-purple-950/40 to-slate-900/90 border-purple-800/50 text-slate-100'
              }`}>
                {/* Header with Lens Badge & Copy Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className={`text-purple-500 ${copilotAnswer.isStreaming ? 'animate-spin' : ''}`} />
                    <span className="text-[11px] font-bold tracking-wider uppercase text-purple-600">
                      {copilotAnswer.lens === 'WhatShouldISay'
                        ? '💬 Spoken Response'
                        : copilotAnswer.lens === 'FollowUp'
                        ? '🎯 Strategic Follow-Ups'
                        : copilotAnswer.lens === 'Negotiation'
                        ? '🤝 Negotiation & Alignment'
                        : copilotAnswer.lens === 'TechnicalAdvice'
                        ? '⚡ Technical Guidance'
                        : '📋 Meeting Action Items'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopyAnswer}
                      title="Copy advice to clipboard"
                      className={`p-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
                        isLight
                          ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {copiedAnswer ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      <span className="text-[10px]">{copiedAnswer ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => handleLensClick(activeLens)}
                      title="Regenerate with current lens"
                      className={`p-1 rounded text-[11px] transition-colors ${
                        isLight
                          ? 'text-slate-500 hover:text-purple-600 hover:bg-slate-100'
                          : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800'
                      }`}
                    >
                      <Sparkles size={12} />
                    </button>
                  </div>
                </div>

                {/* Counterpart's Triggering Utterance / Question (Discreet italic quote) */}
                {copilotAnswer.question && (
                  <div className={`text-xs italic border-l-2 pl-2 py-0.5 line-clamp-2 ${
                    isLight ? 'border-purple-300 text-purple-900/80' : 'border-purple-600/60 text-purple-200/80'
                  }`}>
                    "{copilotAnswer.question}"
                  </div>
                )}

                {/* The Formatted Generated Answer */}
                <div className={`text-xs space-y-1.5 leading-relaxed whitespace-pre-wrap font-sans ${
                  isLight ? 'text-slate-800' : 'text-slate-200'
                }`}>
                  {copilotAnswer.answer || (
                    <span className="italic text-purple-400 animate-pulse">Generating tailored response...</span>
                  )}
                </div>
              </div>
            ) : (
              /* Empty / Idle State: Ready with Quick Action Callouts */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isLight ? 'bg-blue-50 text-blue-600' : 'bg-slate-900 text-blue-400'
                }`}>
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Real-Time Meeting Copilot
                  </p>
                  <p className={`text-[11px] max-w-[280px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    Listening to speech. Click any lens above or let auto-trigger deliver immediate spoken advice.
                  </p>
                </div>

                <button
                  onClick={() => handleLensClick('WhatShouldISay')}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Sparkles size={13} />
                  <span>Suggest "What Should I Say" Now</span>
                </button>
              </div>
            )}

            {/* If Full Transcript Mode is Selected: Show Full History Here */}
            {transcriptDisplayMode === 'full' && (
              <div className={`mt-4 pt-3 border-t space-y-2.5 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold text-[11px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Transcript History ({paragraphs.length})
                  </span>
                  <button
                    onClick={onToggleTranscriptMode}
                    className={`text-[10px] ${isLight ? 'text-blue-600 hover:underline' : 'text-blue-400 hover:underline'}`}
                  >
                    Switch to Discreet Subtitle
                  </button>
                </div>

                {paragraphs.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2 rounded-lg border text-xs ${
                      isLight
                        ? 'bg-white/80 border-slate-200 text-slate-800'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400">
                      <span>{item.startTime}</span>
                      <span className="font-semibold">{item.speaker}</span>
                    </div>
                    <p className="leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Discreet Subtitle Bar (User requirement: ترنسکریپت فقط یه تیکه آخرش باشه و خیلی تو دید نباشه) */}
          {transcriptDisplayMode === 'compact' && (
            <div className={`px-3 py-1.5 border-t flex items-center gap-2 text-xs transition-all ${
              isLight
                ? 'bg-slate-50/90 border-slate-200/80 text-slate-700'
                : 'bg-slate-950/80 border-slate-800/80 text-slate-400'
            }`}>
              <div className="flex items-center gap-1 shrink-0 text-slate-400">
                <Volume2 size={12} className={currentInterim ? 'text-blue-500 animate-pulse' : 'text-slate-400'} />
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Latest:</span>
              </div>

              <div className="flex-1 truncate text-[11px]">
                {currentInterim ? (
                  <span className={`italic font-medium ${isLight ? 'text-blue-600' : 'text-sky-300'}`}>
                    {currentInterim}
                  </span>
                ) : latestSpokenSnippet ? (
                  <span className={`truncate ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    "{latestSpokenSnippet}"
                  </span>
                ) : (
                  <span className="italic opacity-50">Listening for speech...</span>
                )}
              </div>

              {/* Quick expand button to see full transcript if needed */}
              <button
                onClick={onToggleTranscriptMode}
                title="Expand full transcript history"
                className={`p-1 rounded text-[10px] shrink-0 ${
                  isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
                }`}
              >
                <ChevronUp size={12} />
              </button>
            </div>
          )}

          {/* 5. Bottom Toolbar: Opacity quick slider & resize handle */}
          <div className={`px-3 py-1.5 border-t flex items-center justify-between text-xs ${
            isLight
              ? 'bg-slate-50/80 border-slate-200/80 text-slate-600'
              : 'bg-slate-900/70 border-slate-800/80 text-slate-400'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                Opacity
              </span>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className={`w-14 h-1 rounded-lg appearance-none cursor-pointer accent-purple-600 ${
                  isLight ? 'bg-slate-200' : 'bg-slate-700'
                }`}
              />
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                {Math.round(opacity * 100)}%
              </span>
            </div>

            {/* Quick auto-scroll indicator */}
            <div className={`flex items-center gap-1 text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${autoScrollToBottom ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span>{autoScrollToBottom ? 'Auto-scroll ON' : 'Auto-scroll OFF'}</span>
            </div>

            {/* Resize grip */}
            <div
              onMouseDown={handleResizeStart}
              title="Drag to resize"
              className={`cursor-nwse-resize p-1 ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Maximize2 size={12} className="rotate-90" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
