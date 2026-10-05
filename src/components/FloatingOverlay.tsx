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
  Move,
  CheckCircle2,
  RefreshCw,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowDownToLine,
  Lock,
  Unlock,
  Sun,
  Moon
} from 'lucide-react';
import { TranscriptEvent, TranscriptParagraph, CopilotAnswer, ConnectionState } from '../types';

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
  onTriggerCopilot: (question: string) => void;
  onDownloadTranscript: () => void;
  autoScrollToBottom: boolean;
  onToggleAutoScroll?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
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
}) => {
  const [position, setPosition] = useState({ x: 28, y: 84 });
  const [size, setSize] = useState({ width: 440, height: 380 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isMinimized, setIsMinimized] = useState(false);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const paragraphRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Compute matching paragraphs based on search query
  const matchingParagraphs = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return paragraphs.filter((p) => p.text.toLowerCase().includes(q));
  }, [paragraphs, searchQuery]);

  // Reset or clamp active match index
  useEffect(() => {
    if (matchingParagraphs.length === 0) {
      setActiveMatchIndex(0);
    } else if (activeMatchIndex >= matchingParagraphs.length) {
      setActiveMatchIndex(0);
    }
  }, [matchingParagraphs.length, activeMatchIndex]);

  // Jump and scroll to active matching paragraph
  useEffect(() => {
    if (matchingParagraphs.length > 0 && searchQuery.trim()) {
      const activeParagraph = matchingParagraphs[activeMatchIndex];
      if (activeParagraph && paragraphRefs.current[activeParagraph.id]) {
        paragraphRefs.current[activeParagraph.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [activeMatchIndex, matchingParagraphs, searchQuery]);

  // Focus search input when search opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Auto-scroll transcript container to bottom when enabled and not actively searching
  useEffect(() => {
    if (autoScrollToBottom && !searchQuery.trim() && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentInterim, paragraphs, copilotAnswer, autoScrollToBottom, searchQuery]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea, .no-drag')) {
      return;
    }
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
        const newW = Math.max(320, Math.min(800, resizeStart.w + (e.clientX - resizeStart.x)));
        const newH = Math.max(200, Math.min(700, resizeStart.h + (e.clientY - resizeStart.y)));
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

  const handleNextMatch = () => {
    if (matchingParagraphs.length === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % matchingParagraphs.length);
  };

  const handlePrevMatch = () => {
    if (matchingParagraphs.length === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + matchingParagraphs.length) % matchingParagraphs.length);
  };

  // Render text with highlighted keywords
  const renderHighlightedText = (text: string, isCurrentMatch: boolean) => {
    if (!searchQuery.trim()) return text;

    try {
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, i) => {
        if (regex.test(part)) {
          return (
            <mark
              key={i}
              className={`rounded px-1 py-0.2 font-semibold transition-all ${
                isCurrentMatch
                  ? 'bg-amber-400 text-slate-950 shadow-sm ring-2 ring-amber-300'
                  : 'bg-amber-400/40 text-amber-200'
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

  const isLight = theme === 'light';

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
      {/* Titlebar / Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`px-3 py-2 border-b flex items-center justify-between cursor-move ${
          isLight
            ? 'bg-slate-50/85 border-slate-200/80 text-slate-700'
            : 'bg-slate-900/90 border-slate-800/80 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Status Indicator Pip */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : status === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            <span className={`text-xs font-semibold tracking-wide ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              {status === 'connected' ? 'Listening' : status === 'connecting' ? 'Connecting' : 'Overlay'}
            </span>
          </div>
          <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>· Nova-3</span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1 no-drag">
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

          {/* Search Toggle button */}
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setSearchQuery('');
            }}
            title={isSearchOpen ? 'Close Search (Esc)' : 'Search Transcript (Ctrl+F)'}
            className={`p-1 rounded transition-colors ${
              isSearchOpen || searchQuery
                ? isLight
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                : isLight
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Search size={13} />
          </button>

          {/* Auto-scroll Lock Toggle */}
          {onToggleAutoScroll && (
            <button
              onClick={onToggleAutoScroll}
              title={autoScrollToBottom ? 'Auto-scroll: LOCKED to latest speech' : 'Auto-scroll: UNLOCKED (free scroll)'}
              className={`p-1 rounded transition-colors ${
                autoScrollToBottom
                  ? isLight
                    ? 'text-emerald-600 hover:text-emerald-700 hover:bg-slate-200/70'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
                  : isLight
                  ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/70'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ArrowDownToLine size={13} className={autoScrollToBottom ? 'opacity-100' : 'opacity-50'} />
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
          <span className={`text-[11px] font-mono px-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
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

          {/* Download button */}
          <button
            onClick={onDownloadTranscript}
            disabled={paragraphs.length === 0}
            title={paragraphs.length > 0 ? "Download Transcript (.txt)" : "No transcript yet"}
            className={`p-1 rounded transition-colors disabled:opacity-40 ${
              isLight
                ? 'text-slate-500 hover:text-emerald-600 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
            }`}
          >
            <Download size={13} />
          </button>

          {/* Clear button */}
          <button
            onClick={onClear}
            title="Clear Transcripts"
            className={`p-1 rounded transition-colors ${
              isLight
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Trash2 size={13} />
          </button>

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

      {/* Local Text-Based Search Bar */}
      {isSearchOpen && (
        <div className={`px-3 py-2 border-b flex items-center gap-2 text-xs no-drag ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="relative flex-1 flex items-center">
            <Search size={13} className={`absolute left-2.5 pointer-events-none ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveMatchIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.shiftKey) handlePrevMatch();
                  else handleNextMatch();
                } else if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }
              }}
              placeholder="Search transcript keywords (Enter to jump)..."
              className={`w-full rounded pl-7 pr-7 py-1 text-xs focus:outline-none focus:border-blue-500 ${
                isLight
                  ? 'bg-white border border-slate-300 text-slate-800 placeholder-slate-400'
                  : 'bg-slate-950 border border-slate-700/80 text-slate-100 placeholder-slate-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveMatchIndex(0);
                }}
                className={`absolute right-2 ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Match Count & Navigation Controls */}
          {searchQuery.trim() && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded border ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                {matchingParagraphs.length > 0
                  ? `${activeMatchIndex + 1}/${matchingParagraphs.length}`
                  : '0 matches'}
              </span>

              <button
                onClick={handlePrevMatch}
                disabled={matchingParagraphs.length === 0}
                title="Previous match (Shift+Enter)"
                className={`p-1 rounded disabled:opacity-30 ${
                  isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={handleNextMatch}
                disabled={matchingParagraphs.length === 0}
                title="Next match (Enter)"
                className={`p-1 rounded disabled:opacity-30 ${
                  isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {!isMinimized && (
        <>
          {/* Main Content Area: Transcripts & AI Copilot */}
          <div
            ref={scrollRef}
            className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans select-text scroll-smooth"
            style={{ fontSize: `${fontSize}px` }}
          >
            {/* Empty State */}
            {paragraphs.length === 0 && !currentInterim && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Volume2 className="w-8 h-8 mb-2 stroke-1 text-slate-600 animate-pulse" />
                <p className="text-xs font-medium text-slate-400">Waiting for speech...</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-[240px]">
                  Start interview audio to stream real-time interim speech and automatically grouped paragraphs here.
                </p>
              </div>
            )}

            {/* Committed Final Transcripts (Grouped into Paragraphs) */}
            {paragraphs.map((item) => {
              const isInterviewerQuestion = 
                item.text.endsWith('?') || 
                item.text.toLowerCase().includes('tell me about') ||
                item.text.toLowerCase().includes('explain') ||
                item.text.toLowerCase().includes('how do you');

              const isMatch = searchQuery.trim() !== '' && item.text.toLowerCase().includes(searchQuery.toLowerCase().trim());
              const isCurrentActiveMatch = isMatch && matchingParagraphs[activeMatchIndex]?.id === item.id;

              const timeSpan = item.startTime === item.endTime
                ? item.startTime
                : `${item.startTime} – ${item.endTime}`;

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    paragraphRefs.current[item.id] = el;
                  }}
                  className={`group relative transition-all p-2.5 rounded-lg border ${
                    isCurrentActiveMatch
                      ? isLight
                        ? 'bg-amber-100/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-amber-950/30 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                      : isMatch
                      ? isLight
                        ? 'bg-amber-50 border-amber-400/60'
                        : 'bg-amber-950/15 border-amber-600/40'
                      : isLight
                      ? 'bg-white/70 border-slate-200/80 hover:border-slate-300/90 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/40 hover:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      isLight
                        ? 'text-slate-600 bg-slate-100/90 border-slate-200'
                        : 'text-slate-400 bg-slate-950 border-slate-800'
                    }`}>
                      {timeSpan}
                    </span>
                    <span className={`text-[10px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {item.speaker}
                    </span>
                    {isInterviewerQuestion && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                        isLight
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : 'bg-purple-950/70 text-purple-300 border-purple-800/50'
                      }`}>
                        Question Detected
                      </span>
                    )}
                    {isCurrentActiveMatch && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold ml-auto">
                        Current Match
                      </span>
                    )}
                  </div>
                  <p className={`leading-relaxed font-normal ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {renderHighlightedText(item.text, isCurrentActiveMatch)}
                  </p>

                  {/* Manual Copilot Trigger for this paragraph */}
                  <button
                    onClick={() => onTriggerCopilot(item.text)}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 text-[10px] flex items-center gap-1 px-2 py-0.5 rounded border shadow-sm ${
                      isLight
                        ? 'text-purple-700 bg-purple-100 hover:bg-purple-200 border-purple-300'
                        : 'text-purple-300 hover:text-purple-200 bg-purple-950/80 hover:bg-purple-900 border-purple-700/60'
                    }`}
                  >
                    <Sparkles size={11} />
                    <span>Get Answer</span>
                  </button>
                </div>
              );
            })}

            {/* Active Interim Results Stream */}
            {currentInterim && (
              <div className={`p-2 rounded-lg transition-all border ${
                isLight
                  ? 'bg-sky-50/90 border-sky-300/80 text-sky-900'
                  : 'bg-sky-950/30 border-sky-800/40 text-sky-300'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
                  <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                    CURRENT SPEECH:
                  </span>
                </div>
                <p className={`italic font-medium leading-relaxed ${isLight ? 'text-sky-800' : 'text-sky-300'}`}>
                  {currentInterim}
                </p>
              </div>
            )}

            {/* AI Copilot Answer Card */}
            {copilotAnswer && (
              <div className={`p-3 rounded-lg border shadow-lg space-y-2 mt-2 ${
                isLight
                  ? 'bg-purple-50/90 border-purple-200/90 text-slate-800 shadow-purple-100/50'
                  : 'bg-gradient-to-b from-purple-950/40 to-slate-900/80 border-purple-800/50 text-slate-100'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 ${isLight ? 'text-purple-800' : 'text-purple-300'}`}>
                    <Sparkles size={13} className={copilotAnswer.isStreaming ? 'animate-spin' : ''} />
                    <span className="text-[11px] font-bold tracking-wider uppercase">
                      AI Interview Copilot
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-purple-600' : 'text-purple-400/80'}`}>
                    {copilotAnswer.isStreaming ? 'Streaming...' : 'STAR Advice'}
                  </span>
                </div>

                <div className={`text-xs italic border-l-2 pl-2 py-0.5 ${
                  isLight
                    ? 'border-purple-400 text-purple-900'
                    : 'border-purple-600/60 text-purple-200/90'
                }`}>
                  "{copilotAnswer.question}"
                </div>

                <div className={`text-xs space-y-1 leading-relaxed whitespace-pre-wrap font-sans ${
                  isLight ? 'text-slate-700' : 'text-slate-200'
                }`}>
                  {copilotAnswer.answer}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar: Opacity quick slider & resize handle */}
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
                className={`w-16 h-1 rounded-lg appearance-none cursor-pointer accent-purple-600 ${
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
