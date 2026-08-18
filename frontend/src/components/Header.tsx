import React from 'react';
import { ShieldCheck, Cpu, RefreshCw, Layers } from 'lucide-react';
import type { SystemStatus } from '../types';

interface HeaderProps {
  system: SystemStatus | null;
  onUpdateYtdlp: () => void;
  updating: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  system,
  onUpdateYtdlp,
  updating
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-white tracking-tight">
                Aether<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">DL</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                v2026.1
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Universal yt-dlp Media Studio & Command Suite
            </p>
          </div>
        </div>

        {/* System Health / Status Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {/* yt-dlp version */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <ShieldCheck className={`w-3.5 h-3.5 ${system?.ytdlp.installed ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className="text-slate-400">yt-dlp:</span>
            <span className="font-mono font-bold text-slate-200">
              {system?.ytdlp.version || 'Checking...'}
            </span>
            <button
              type="button"
              onClick={onUpdateYtdlp}
              disabled={updating}
              title="Update yt-dlp to latest version"
              className="p-1 rounded text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${updating ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          {/* ffmpeg version */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <Cpu className={`w-3.5 h-3.5 ${system?.ffmpeg.installed ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-slate-400">FFmpeg:</span>
            <span className="font-mono font-bold text-slate-200">
              {system?.ffmpeg.version || 'Checking...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
