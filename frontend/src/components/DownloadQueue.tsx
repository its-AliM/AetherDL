import React, { useState } from 'react';
import { Download, Play, Square, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp, Terminal, Trash2 } from 'lucide-react';
import type { DownloadJob } from '../types';

interface DownloadQueueProps {
  jobs: DownloadJob[];
  onCancelJob: (id: string) => void;
  onClearCompleted: () => void;
}

export const DownloadQueue: React.FC<DownloadQueueProps> = ({
  jobs,
  onCancelJob,
  onClearCompleted
}) => {
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const toggleLogs = (id: string) => {
    setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const finishedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-400" />
            Download Manager & Active Tasks ({jobs.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-threaded progress, speed metering, ETA and terminal logs.
          </p>
        </div>

        {finishedJobs.length > 0 && (
          <button
            type="button"
            onClick={onClearCompleted}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Finished
          </button>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 text-center space-y-2">
          <Download className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-medium text-slate-400">No active or pending downloads</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Paste a URL above and hit Analyze or choose a Quick Preset to start downloading.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const isLogsOpen = expandedLogs[job.id];
            const isDownloading = job.status === 'downloading';
            const isCompleted = job.status === 'completed';
            const isFailed = job.status === 'failed';
            const isCancelled = job.status === 'cancelled';

            return (
              <div
                key={job.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isDownloading
                    ? 'bg-slate-900/90 border-indigo-500/50 shadow-lg shadow-indigo-500/5'
                    : isCompleted
                    ? 'bg-slate-900/60 border-emerald-500/30'
                    : isFailed
                    ? 'bg-slate-900/60 border-red-500/30'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="p-4 space-y-3">
                  {/* Top line: Status badge, Title, Action buttons */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 flex-shrink-0">
                        {isDownloading && <Play className="w-4 h-4 text-indigo-400 animate-pulse fill-indigo-400/20" />}
                        {isCompleted && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        {isFailed && <AlertCircle className="w-4 h-4 text-red-400" />}
                        {isCancelled && <Clock className="w-4 h-4 text-slate-400" />}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate max-w-md">
                          {job.title || job.filename || job.url}
                        </h4>
                        <span className="font-mono text-[11px] text-slate-400 truncate block">
                          {job.url}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isDownloading && (
                        <button
                          type="button"
                          onClick={() => onCancelJob(job.id)}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          Cancel
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleLogs(job.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-700 transition-all cursor-pointer"
                      >
                        <Terminal className="w-3 h-3 text-indigo-400" />
                        <span>Logs ({job.logs.length})</span>
                        {isLogsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar & Details */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : isFailed
                            ? 'bg-red-500'
                            : isCancelled
                            ? 'bg-slate-600'
                            : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                        }`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white">
                          {job.progress.toFixed(1)}%
                        </span>
                        {job.speed && <span>⚡ {job.speed}</span>}
                        {job.size && <span>📦 {job.size}</span>}
                      </div>

                      <div className="flex items-center gap-3">
                        {job.eta && <span>⏳ ETA: {job.eta}</span>}
                        <span className={`capitalize font-semibold ${
                          isCompleted ? 'text-emerald-400' : isFailed ? 'text-red-400' : isCancelled ? 'text-slate-400' : 'text-indigo-400'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Live Log Output */}
                {isLogsOpen && (
                  <div className="border-t border-slate-800/80 bg-slate-950 p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1 select-all">
                    {job.logs.map((log, index) => (
                      <div
                        key={index}
                        className={`leading-relaxed ${
                          log.type === 'stderr' ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        <span className="text-slate-600 mr-2">[{log.time}]</span>
                        {log.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
