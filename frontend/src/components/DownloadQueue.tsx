import React, { useState, useMemo } from 'react';
import {
  Download,
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Terminal,
  Trash2,
  Pause,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Search,
  Layers,
  FolderOpen
} from 'lucide-react';
import type { DownloadJob } from '../types';

interface DownloadQueueProps {
  jobs: DownloadJob[];
  isQueuePaused?: boolean;
  maxConcurrent?: number;
  onCancelJob: (id: string) => void;
  onPauseJob?: (id: string) => void;
  onResumeJob?: (id: string) => void;
  onRetryJob?: (id: string) => void;
  onRemoveJob?: (id: string) => void;
  onReorderQueue?: (activeQueueIds: string[]) => void;
  onPauseAllQueue?: () => void;
  onResumeAllQueue?: () => void;
  onClearCompleted: () => void;
  onClearAll?: () => void;
  onOpenFolder?: () => void;
}

type FilterTab = 'all' | 'queued' | 'downloading' | 'completed' | 'failed';

export const DownloadQueue: React.FC<DownloadQueueProps> = ({
  jobs,
  isQueuePaused = false,
  maxConcurrent = 2,
  onCancelJob,
  onPauseJob,
  onResumeJob,
  onRetryJob,
  onRemoveJob,
  onReorderQueue,
  onPauseAllQueue,
  onResumeAllQueue,
  onClearCompleted,
  onClearAll,
  onOpenFolder
}) => {
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleLogs = (id: string) => {
    setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Counts
  const counts = useMemo(() => {
    return {
      all: jobs.length,
      downloading: jobs.filter(j => j.status === 'downloading').length,
      queued: jobs.filter(j => j.status === 'queued').length,
      paused: jobs.filter(j => j.status === 'paused').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed' || j.status === 'cancelled').length
    };
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Tab filter
      if (activeFilter === 'downloading' && job.status !== 'downloading') return false;
      if (activeFilter === 'queued' && job.status !== 'queued' && job.status !== 'paused') return false;
      if (activeFilter === 'completed' && job.status !== 'completed') return false;
      if (activeFilter === 'failed' && job.status !== 'failed' && job.status !== 'cancelled') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (job.title || '').toLowerCase().includes(query);
        const urlMatch = (job.url || '').toLowerCase().includes(query);
        const fileMatch = (job.filename || '').toLowerCase().includes(query);
        return titleMatch || urlMatch || fileMatch;
      }

      return true;
    });
  }, [jobs, activeFilter, searchQuery]);

  // Reorder helper for queued items
  const handleMoveQueue = (jobId: string, direction: 'up' | 'down') => {
    if (!onReorderQueue) return;
    const queuedJobs = jobs.filter(j => j.status === 'queued' || j.status === 'paused');
    const index = queuedJobs.findIndex(j => j.id === jobId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queuedJobs.length) return;

    const newQueued = [...queuedJobs];
    const temp = newQueued[index];
    newQueued[index] = newQueued[targetIndex];
    newQueued[targetIndex] = temp;

    onReorderQueue(newQueued.map(j => j.id));
  };

  const hasFinishedJobs = counts.completed > 0 || counts.failed > 0;

  return (
    <div className="space-y-4">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Download Queue & Manager
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {jobs.length} items
                </span>
                {isQueuePaused && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    Queue Paused
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Active slots: {counts.downloading}/{maxConcurrent} • Queued: {counts.queued} • Completed: {counts.completed}
              </p>
            </div>
          </div>
        </div>

        {/* Global Queue Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenFolder && (
            <button
              type="button"
              onClick={onOpenFolder}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              Open Folder
            </button>
          )}

          {/* Pause / Resume entire queue */}
          {counts.queued > 0 || counts.downloading > 0 || isQueuePaused ? (
            isQueuePaused ? (
              <button
                type="button"
                onClick={onResumeAllQueue}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume Queue
              </button>
            ) : (
              <button
                type="button"
                onClick={onPauseAllQueue}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                Pause Queue
              </button>
            )
          ) : null}

          {hasFinishedJobs && (
            <button
              type="button"
              onClick={onClearCompleted}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              title="Clear finished & failed jobs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Finished
            </button>
          )}

          {jobs.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="Cancel all active and clear entire queue"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'downloading', label: 'Downloading', count: counts.downloading },
            { id: 'queued', label: 'In Queue', count: counts.queued + counts.paused },
            { id: 'completed', label: 'Completed', count: counts.completed },
            { id: 'failed', label: 'Failed / Cancelled', count: counts.failed }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as FilterTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeFilter === tab.id ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queue items..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
          />
        </div>
      </div>

      {/* Queue Items List */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto text-slate-500">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-300">
              {jobs.length === 0 ? 'Download Queue is Empty' : 'No matching downloads in this tab'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {jobs.length === 0
                ? 'Select presets or inspect media and click "Add to Queue" to begin.'
                : 'Try switching filters or clearing your search term.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const isLogsOpen = expandedLogs[job.id];
            const isDownloading = job.status === 'downloading';
            const isQueued = job.status === 'queued';
            const isPaused = job.status === 'paused';
            const isCompleted = job.status === 'completed';
            const isFailed = job.status === 'failed';
            const isCancelled = job.status === 'cancelled';

            // Find index among queued jobs for ordering arrows
            const queuedList = jobs.filter(j => j.status === 'queued' || j.status === 'paused');
            const queuedIndex = queuedList.findIndex(j => j.id === job.id);
            const canMoveUp = (isQueued || isPaused) && queuedIndex > 0;
            const canMoveDown = (isQueued || isPaused) && queuedIndex >= 0 && queuedIndex < queuedList.length - 1;

            return (
              <div
                key={job.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isDownloading
                    ? 'bg-slate-900/90 border-indigo-500/50 shadow-xl shadow-indigo-500/5 ring-1 ring-indigo-500/30'
                    : isCompleted
                    ? 'bg-slate-900/60 border-emerald-500/30'
                    : isFailed
                    ? 'bg-slate-900/60 border-red-500/30'
                    : isPaused
                    ? 'bg-slate-900/60 border-amber-500/30'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="p-4 space-y-3">
                  {/* Top line: Status Icon, Title, URL, Action buttons */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 flex-shrink-0">
                        {isDownloading && (
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400 animate-pulse" />
                          </div>
                        )}
                        {isQueued && (
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {isPaused && (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          </div>
                        )}
                        {isCompleted && (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {isFailed && (
                          <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {isCancelled && (
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                            <Square className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate max-w-md md:max-w-lg">
                            {job.title || job.filename || job.url}
                          </h4>
                          {(isQueued || isPaused) && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-400 border border-slate-700">
                              Queue #{queuedIndex + 1}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 truncate block max-w-md md:max-w-xl">
                          {job.url}
                        </span>
                      </div>
                    </div>

                    {/* Job Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Queued reordering */}
                      {(isQueued || isPaused) && onReorderQueue && (
                        <div className="flex items-center gap-1 mr-1">
                          <button
                            type="button"
                            disabled={!canMoveUp}
                            onClick={() => handleMoveQueue(job.id, 'up')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 transition-all cursor-pointer disabled:cursor-not-allowed"
                            title="Move up in queue"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={!canMoveDown}
                            onClick={() => handleMoveQueue(job.id, 'down')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 transition-all cursor-pointer disabled:cursor-not-allowed"
                            title="Move down in queue"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Pause / Resume single job */}
                      {isDownloading && onPauseJob && (
                        <button
                          type="button"
                          onClick={() => onPauseJob(job.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                          title="Pause download"
                        >
                          <Pause className="w-3 h-3 fill-current" />
                          Pause
                        </button>
                      )}

                      {isPaused && onResumeJob && (
                        <button
                          type="button"
                          onClick={() => onResumeJob(job.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                          title="Resume download"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Resume
                        </button>
                      )}

                      {/* Cancel active download */}
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

                      {/* Retry failed or cancelled */}
                      {(isFailed || isCancelled) && onRetryJob && (
                        <button
                          type="button"
                          onClick={() => onRetryJob(job.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry
                        </button>
                      )}

                      {/* Remove item from list */}
                      {(!isDownloading && onRemoveJob) && (
                        <button
                          type="button"
                          onClick={() => onRemoveJob(job.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 border border-slate-700 transition-all cursor-pointer"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      {/* Toggle logs */}
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
                            : isPaused
                            ? 'bg-amber-500'
                            : 'bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-400'
                        }`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white">
                          {job.progress.toFixed(1)}%
                        </span>
                        {job.speed && <span className="text-cyan-400 font-semibold">⚡ {job.speed}</span>}
                        {job.size && <span>📦 {job.size}</span>}
                        {job.filename && !isCompleted && (
                          <span className="text-slate-500 hidden sm:inline max-w-xs truncate">
                            {job.filename}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {job.eta && <span className="text-amber-300">⏳ ETA: {job.eta}</span>}
                        <span className={`capitalize font-semibold ${
                          isCompleted
                            ? 'text-emerald-400'
                            : isFailed
                            ? 'text-red-400'
                            : isCancelled
                            ? 'text-slate-400'
                            : isPaused
                            ? 'text-amber-400'
                            : isQueued
                            ? 'text-slate-400'
                            : 'text-indigo-400'
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
                    {job.logs.length === 0 ? (
                      <div className="text-slate-600 italic">No output logs recorded yet.</div>
                    ) : (
                      job.logs.map((log, index) => (
                        <div
                          key={index}
                          className={`leading-relaxed ${
                            log.type === 'stderr' ? 'text-rose-400' : 'text-slate-300'
                          }`}
                        >
                          <span className="text-slate-600 mr-2">[{log.time}]</span>
                          {log.text}
                        </div>
                      ))
                    )}
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
