import React, { useState } from 'react';
import { Terminal, Copy, Check, Sparkles } from 'lucide-react';

interface CommandPreviewProps {
  command: string;
  onRun: () => void;
  loading: boolean;
  rawArgs: string;
  onRawArgsChange: (val: string) => void;
}

export const CommandPreview: React.FC<CommandPreviewProps> = ({
  command,
  onRun,
  loading,
  rawArgs,
  onRawArgsChange
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 backdrop-blur-xl p-4 shadow-xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Live CLI Command Generator
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            100% Native yt-dlp Output
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Command</span>
            </>
          )}
        </button>
      </div>

      {/* Code Box */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto select-all whitespace-pre-wrap break-all leading-relaxed shadow-inner">
        {command || 'yt-dlp [options] <URL>'}
      </div>

      {/* Raw Custom Arguments Bar */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-slate-400 whitespace-nowrap font-medium">
          Extra CLI Flags:
        </span>
        <input
          type="text"
          value={rawArgs}
          onChange={(e) => onRawArgsChange(e.target.value)}
          placeholder="e.g. --embed-subs --compat-options no-youtube-channel-redirect"
          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
        />
        <button
          type="button"
          onClick={onRun}
          disabled={loading}
          className="px-5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {loading ? 'Adding...' : 'Add to Queue'}
        </button>
      </div>
    </div>
  );
};
