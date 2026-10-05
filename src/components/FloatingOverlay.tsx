import React, { useState, useRef, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { TranscriptEvent, CopilotAnswer, ConnectionState } from '../types';

interface FloatingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  status: ConnectionState;
  currentInterim: string;
  finalTranscripts: TranscriptEvent[];
  copilotAnswer: CopilotAnswer | null;
  onClear: () => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  onTriggerCopilot: (question: string) => void;
}

export const FloatingOverlay: React.FC<FloatingOverlayProps> = ({
  isOpen,
  onClose,
  status,
  currentInterim,
  finalTranscripts,
  copilotAnswer,
  onClear,
  opacity,
  onOpacityChange,
  fontSize,
  onFontSizeChange,
  onTriggerCopilot,
}) => {
  const [position, setPosition] = useState({ x: 28, y: 84 });
  const [size, setSize] = useState({ width: 440, height: 380 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript container to bottom when new words come in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentInterim, finalTranscripts, copilotAnswer]);

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
      className={`fixed top-0 left-0 z-50 rounded-xl flex flex-col bg-slate-950/95 backdrop-blur-md border border-slate-800/80 shadow-2xl text-slate-100 select-none overflow-hidden transition-opacity duration-150`}
    >
      {/* Titlebar / Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between cursor-move"
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
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-xs font-semibold tracking-wide text-slate-300">
              {status === 'connected' ? 'Listening' : status === 'connecting' ? 'Connecting' : 'Overlay'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">· Nova-3</span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1 no-drag">
          {/* Font Size controls */}
          <button
            onClick={() => onFontSizeChange(Math.max(12, fontSize - 1))}
            title="Decrease Font Size"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <Minus size={13} />
          </button>
          <span className="text-[11px] font-mono text-slate-400 px-0.5">{fontSize}px</span>
          <button
            onClick={() => onFontSizeChange(Math.min(22, fontSize + 1))}
            title="Increase Font Size"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <Plus size={13} />
          </button>

          <div className="w-[1px] h-3 bg-slate-800 mx-1" />

          {/* Clear button */}
          <button
            onClick={onClear}
            title="Clear Transcripts"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <Trash2 size={13} />
          </button>

          {/* Minimize toggle */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Collapse'}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <Minus size={13} />
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            title="Close Overlay"
            className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors ml-0.5"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Main Content Area: Transcripts & AI Copilot */}
          <div
            ref={scrollRef}
            className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans select-text scroll-smooth"
            style={{ fontSize: `${fontSize}px` }}
          >
            {/* Empty State */}
            {finalTranscripts.length === 0 && !currentInterim && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Volume2 className="w-8 h-8 mb-2 stroke-1 text-slate-600 animate-pulse" />
                <p className="text-xs font-medium text-slate-400">Waiting for speech...</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-[240px]">
                  Start interview audio to stream real-time interim and final transcripts here.
                </p>
              </div>
            )}

            {/* Committed Final Transcripts */}
            {finalTranscripts.map((item, idx) => {
              const isInterviewerQuestion = 
                item.text.endsWith('?') || 
                item.text.toLowerCase().includes('tell me about') ||
                item.text.toLowerCase().includes('explain') ||
                item.text.toLowerCase().includes('how do you');

              return (
                <div key={idx} className="group relative transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-slate-500">{item.timestamp}</span>
                    {isInterviewerQuestion && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/70 border border-purple-800/50 text-purple-300 font-medium">
                        Question Detected
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 leading-relaxed font-normal">
                    {item.text}
                  </p>

                  {/* Manual Copilot Trigger for this line */}
                  <button
                    onClick={() => onTriggerCopilot(item.text)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-0 text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700/60 shadow-sm"
                  >
                    <Sparkles size={11} />
                    <span>Get Answer</span>
                  </button>
                </div>
              );
            })}

            {/* Active Interim Results Stream */}
            {currentInterim && (
              <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-800/40 transition-all">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                  <span className="text-[10px] font-mono font-bold tracking-wider text-sky-400 uppercase">
                    CURRENT SPEECH:
                  </span>
                </div>
                <p className="text-sky-300 italic font-medium leading-relaxed">
                  {currentInterim}
                </p>
              </div>
            )}

            {/* AI Copilot Answer Card */}
            {copilotAnswer && (
              <div className="p-3 rounded-lg bg-gradient-to-b from-purple-950/40 to-slate-900/80 border border-purple-800/50 shadow-lg text-slate-100 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-300">
                    <Sparkles size={13} className={copilotAnswer.isStreaming ? 'animate-spin' : ''} />
                    <span className="text-[11px] font-bold tracking-wider uppercase">
                      AI Interview Copilot
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-400/80">
                    {copilotAnswer.isStreaming ? 'Streaming...' : 'STAR Advice'}
                  </span>
                </div>

                <div className="text-xs text-purple-200/90 italic border-l-2 border-purple-600/60 pl-2 py-0.5">
                  "{copilotAnswer.question}"
                </div>

                <div className="text-xs text-slate-200 space-y-1 leading-relaxed whitespace-pre-wrap font-sans">
                  {copilotAnswer.answer}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar: Opacity quick slider & resize handle */}
          <div className="px-3 py-1.5 bg-slate-900/70 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Opacity</span>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-[10px] font-mono text-slate-500">{Math.round(opacity * 100)}%</span>
            </div>

            {/* Resize grip */}
            <div
              onMouseDown={handleResizeStart}
              title="Drag to resize"
              className="cursor-nwse-resize p-1 text-slate-500 hover:text-slate-300"
            >
              <Maximize2 size={12} className="rotate-90" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
