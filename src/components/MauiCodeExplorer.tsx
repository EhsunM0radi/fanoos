import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Folder, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  ChevronRight, 
  FileText, 
  Layers, 
  Cpu, 
  ExternalLink 
} from 'lucide-react';
import JSZip from 'jszip';

interface MauiFile {
  path: string;
  name: string;
  content: string;
}

interface MauiCodeExplorerProps {
  theme?: 'light' | 'dark';
}

export const MauiCodeExplorer: React.FC<MauiCodeExplorerProps> = ({ theme = 'light' }) => {
  const [files, setFiles] = useState<MauiFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MauiFile | null>(null);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const isLight = theme === 'light';

  useEffect(() => {
    fetch('/api/maui/files')
      .then((res) => res.json())
      .then((data) => {
        if (data.files && data.files.length > 0) {
          setFiles(data.files);
          // Default select DeepgramSpeechProvider.cs or InterviewAssistant.csproj
          const defaultFile = data.files.find((f: MauiFile) => f.name === 'DeepgramSpeechProvider.cs') || data.files[0];
          setSelectedFile(defaultFile);
        }
      })
      .catch((err) => console.error('Failed to load MAUI files:', err));
  }, []);

  const handleCopy = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    if (files.length === 0) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('InterviewAssistant');

      files.forEach((file) => {
        rootFolder?.file(file.path, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'InterviewAssistant-dotnet8-maui.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className={`w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all backdrop-blur-2xl ${
      isLight
        ? 'bg-white/80 border border-white/90 text-slate-800 shadow-slate-300/50 ring-1 ring-slate-900/5'
        : 'bg-slate-900 border border-slate-800 text-slate-100'
    }`}>
      {/* Top Banner */}
      <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isLight
          ? 'bg-slate-50/80 border-slate-200/80'
          : 'bg-slate-950/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
              isLight ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-blue-950 text-blue-400'
            }`}>
              .NET 8 MAUI
            </span>
            <h2 className={`text-sm font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Windows Native Architecture Solution
            </h2>
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Complete C# &amp; XAML project tree implementing all MVP interfaces, WinUI 3 AppWindow, and Deepgram Nova-3.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isZipping || files.length === 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all shrink-0"
        >
          <Download size={14} />
          <span>{isZipping ? 'Generating ZIP...' : 'Download .NET 8 Project (.zip)'}</span>
        </button>
      </div>

      {/* Terminal Build Guide Bar */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between text-xs font-mono overflow-x-auto ${
        isLight
          ? 'bg-slate-100/90 border-slate-200 text-slate-600'
          : 'bg-slate-950 border-slate-800 text-slate-400'
      }`}>
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-emerald-500 shrink-0" />
          <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Windows Terminal:</span>
          <span className={`font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>dotnet build -f net8.0-windows10.0.19041.0</span>
          <span className="text-slate-400">&&</span>
          <span className={`font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>dotnet run -f net8.0-windows10.0.19041.0</span>
        </div>
        <span className={`text-[11px] shrink-0 ml-4 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Target: Windows 10/11</span>
      </div>

      {/* Split Viewer */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[500px]">
        {/* Left: File Tree */}
        <div className={`w-full md:w-64 border-r p-3 overflow-y-auto space-y-1 ${
          isLight
            ? 'bg-slate-50/70 border-slate-200/80 text-slate-700'
            : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
        }`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 flex items-center gap-1.5 ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <Folder size={12} className="text-blue-500" />
            <span>Project Files ({files.length})</span>
          </div>

          <div className="space-y-0.5 pt-1">
            {files.map((file) => {
              const isSelected = selectedFile?.path === file.path;
              const isXaml = file.name.endsWith('.xaml');
              const isCs = file.name.endsWith('.cs');
              const isCsproj = file.name.endsWith('.csproj');

              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <FileCode
                    size={13}
                    className={
                      isCs
                        ? 'text-emerald-400'
                        : isXaml
                        ? 'text-purple-400'
                        : isCsproj
                        ? 'text-blue-400'
                        : 'text-slate-400'
                    }
                  />
                  <span className="truncate font-mono text-[11px]">{file.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {selectedFile ? (
            <>
              {/* File Header */}
              <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300">{selectedFile.path}</span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Code Area */}
              <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed select-text bg-slate-950">
                <code>{selectedFile.content}</code>
              </pre>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a file on the left to inspect its implementation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
