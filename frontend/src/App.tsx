import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Zap, 
  SlidersHorizontal, 
  Layers, 
  FolderOpen 
} from 'lucide-react';
import { Header } from './components/Header';
import { MediaInspector } from './components/MediaInspector';
import { QuickPresets } from './components/QuickPresets';
import { OptionsExplorer } from './components/OptionsExplorer';
import { DownloadQueue } from './components/DownloadQueue';
import { FileBrowser } from './components/FileBrowser';
import { CommandPreview } from './components/CommandPreview';
import type { SystemStatus, MediaMetadata, DownloadJob, DownloadedFile, YtSchema } from './types';

// Raw bundled flags
import schemaJson from './ytdlp_schema.json';
const schemaData = schemaJson as unknown as YtSchema;

export function App() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'inspector' | 'presets' | 'options' | 'downloads' | 'files'>('inspector');
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [options, setOptions] = useState<Record<string, string | number | boolean | string[]>>({});
  const [rawArgs, setRawArgs] = useState('');
  const [generatedCommand, setGeneratedCommand] = useState('yt-dlp');
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [maxConcurrent, setMaxConcurrent] = useState(2);
  const [files, setFiles] = useState<DownloadedFile[]>([]);
  const [isStartingDownload, setIsStartingDownload] = useState(false);
  const [updatingYtdlp, setUpdatingYtdlp] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Sync System Status
  const fetchSystemStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system');
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
        if (typeof data.isQueuePaused === 'boolean') {
          setIsQueuePaused(data.isQueuePaused);
        }
        if (typeof data.maxConcurrent === 'number') {
          setMaxConcurrent(data.maxConcurrent);
        }
      }
    } catch {
      // Offline fallback
    }
  }, []);

  // Sync Jobs from REST endpoint
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        }
        if (typeof data.isQueuePaused === 'boolean') {
          setIsQueuePaused(data.isQueuePaused);
        }
        if (typeof data.maxConcurrent === 'number') {
          setMaxConcurrent(data.maxConcurrent);
        }
      }
    } catch {
      // Backend may be reloading
    }
  }, []);

  // Sync Media Library Files
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Update Generated Command string
  const updateCommandPreview = useCallback(async () => {
    try {
      const payloadOpts = { ...options };
      if (selectedFormatId && !payloadOpts['format'] && !payloadOpts['extract-audio']) {
        payloadOpts['format'] = selectedFormatId;
      }

      const res = await fetch('/api/preview-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          options: payloadOpts,
          customArgs: rawArgs
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedCommand(data.command);
      }
    } catch {
      // Fallback
    }
  }, [options, selectedFormatId, url, rawArgs]);

  useEffect(() => {
    updateCommandPreview();
  }, [updateCommandPreview]);

  // WebSocket for real-time download streaming with polling fallback
  useEffect(() => {
    fetchSystemStatus();
    fetchJobs();
    fetchFiles();

    let isSubscribed = true;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In Vite development, backend runs on port 4000; connect directly or fallback
      const host = window.location.port === '3000' ? `${window.location.hostname}:4000` : window.location.host;
      const wsUrl = `${protocol}//${host}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'init') {
              setJobs(msg.jobs || []);
              if (typeof msg.isQueuePaused === 'boolean') setIsQueuePaused(msg.isQueuePaused);
              if (typeof msg.maxConcurrent === 'number') setMaxConcurrent(msg.maxConcurrent);
            } else if (msg.type === 'job_added') {
              setJobs(prev => {
                const exists = prev.find(j => j.id === msg.job.id);
                if (exists) {
                  return prev.map(j => j.id === msg.job.id ? { ...j, ...msg.job } : j);
                }
                return [msg.job, ...prev];
              });
            } else if (msg.type === 'job_updated' || msg.type === 'job_progress') {
              const updatedJob = msg.job;
              const targetId = msg.jobId || updatedJob?.id;
              setJobs(prev => prev.map(j => (j.id === targetId ? { ...j, ...updatedJob } : j)));
            } else if (msg.type === 'job_completed') {
              setJobs(prev => prev.map(j => (j.id === msg.job?.id ? { ...j, ...msg.job } : j)));
              fetchFiles();
            } else if (msg.type === 'job_log') {
              setJobs(prev => prev.map(j => {
                if (j.id === msg.jobId) {
                  return { ...j, logs: [...j.logs, msg.log] };
                }
                return j;
              }));
            } else if (msg.type === 'queue_reordered') {
              // Reorder jobs list according to queueIds
              if (Array.isArray(msg.queueIds)) {
                setJobs(prev => {
                  const jobMap = new Map(prev.map(j => [j.id, j]));
                  const reordered: DownloadJob[] = [];
                  // Add downloading / non-queued first if they were there or maintain order
                  const nonQueued = prev.filter(j => !msg.queueIds.includes(j.id));
                  for (const id of msg.queueIds) {
                    const found = jobMap.get(id);
                    if (found) reordered.push(found);
                  }
                  return [...nonQueued, ...reordered];
                });
              }
            } else if (msg.type === 'queue_paused_state') {
              setIsQueuePaused(!!msg.isQueuePaused);
            } else if (msg.type === 'job_removed') {
              setJobs(prev => prev.filter(j => j.id !== msg.jobId));
            } else if (msg.type === 'queue_cleared') {
              setJobs([]);
            }
          } catch (e) {
            console.error('WS parse error', e);
          }
        };

        ws.onclose = () => {
          if (isSubscribed) {
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        console.error('WS connect error', e);
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connectWs, 3000);
        }
      }
    };

    connectWs();

    // Fallback polling interval to ensure queue status never falls out of sync
    const pollInterval = setInterval(() => {
      fetchJobs();
    }, 4000);

    return () => {
      isSubscribed = false;
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchSystemStatus, fetchJobs, fetchFiles]);

  // Inspect URL
  const handleInspect = async () => {
    if (!url.trim()) return;
    setInspectLoading(true);
    try {
      const res = await fetch('/api/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (res.ok) {
        setMetadata(data);
        if (data.formats?.length > 0) {
          setSelectedFormatId(data.formats[0].format_id);
        }
      } else {
        alert(data.error || 'Failed to inspect media URL');
      }
    } catch (err: unknown) {
      alert('Network error while inspecting media: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setInspectLoading(false);
    }
  };

  // Change individual yt-dlp option
  const handleChangeOption = (id: string, value: string | number | boolean | string[] | undefined) => {
    setOptions(prev => {
      const next = { ...prev };
      if (value === undefined || value === false || value === '') {
        delete next[id];
      } else {
        next[id] = value;
      }
      return next;
    });
  };

  // Apply Preset
  const handleApplyPreset = (_name: string, presetOpts: Record<string, string | number | boolean | string[]>) => {
    setOptions(prev => ({ ...prev, ...presetOpts }));
    setActiveTab('options');
  };

  // Trigger Add to Queue
  const handleAddToQueue = async (customOpts?: Record<string, string | number | boolean | string[]>, title?: string) => {
    if (!url.trim()) {
      alert('Please enter a media URL before adding to queue.');
      return;
    }

    setIsStartingDownload(true);
    const finalOpts = customOpts || { ...options };
    if (selectedFormatId && !finalOpts['format'] && !finalOpts['extract-audio']) {
      finalOpts['format'] = selectedFormatId;
    }

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          options: finalOpts,
          customArgs: rawArgs,
          title: title || metadata?.title || 'Downloading media...'
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Immediately fetch refreshed queue and switch tab
        fetchJobs();
        setActiveTab('downloads');
      } else {
        alert(data.error || 'Failed to add download to queue');
      }
    } catch (err: unknown) {
      alert('Queue error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsStartingDownload(false);
    }
  };

  // Cancel Download Job
  const handleCancelJob = async (jobId: string) => {
    try {
      await fetch(`/api/cancel/${jobId}`, { method: 'POST' });
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  // Pause Job
  const handlePauseJob = async (jobId: string) => {
    try {
      await fetch(`/api/queue/pause/${jobId}`, { method: 'POST' });
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  // Resume Job
  const handleResumeJob = async (jobId: string) => {
    try {
      await fetch(`/api/queue/resume/${jobId}`, { method: 'POST' });
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  // Retry Job
  const handleRetryJob = async (jobId: string) => {
    try {
      await fetch(`/api/queue/retry/${jobId}`, { method: 'POST' });
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  // Remove Job
  const handleRemoveJob = async (jobId: string) => {
    try {
      await fetch(`/api/queue/remove/${jobId}`, { method: 'POST' });
      setJobs(prev => prev.filter(j => j.id !== jobId));
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  // Reorder Queue
  const handleReorderQueue = async (queueIds: string[]) => {
    try {
      await fetch('/api/queue/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueIds })
      });
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  // Pause / Resume entire Queue
  const handlePauseAllQueue = async () => {
    try {
      await fetch('/api/queue/pause-all', { method: 'POST' });
      setIsQueuePaused(true);
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResumeAllQueue = async () => {
    try {
      await fetch('/api/queue/resume-all', { method: 'POST' });
      setIsQueuePaused(false);
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  // Clear completed jobs from UI & server
  const handleClearCompleted = async () => {
    try {
      await fetch('/api/queue/clear-finished', { method: 'POST' });
      setJobs(prev => prev.filter(j => j.status === 'downloading' || j.status === 'queued' || j.status === 'paused'));
    } catch {
      setJobs(prev => prev.filter(j => j.status === 'downloading' || j.status === 'queued' || j.status === 'paused'));
    }
  };

  // Clear all
  const handleClearAll = async () => {
    if (!confirm('Cancel all running downloads and clear the queue?')) return;
    try {
      await fetch('/api/queue/clear-all', { method: 'POST' });
      setJobs([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Delete downloaded file
  const handleDeleteFile = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFiles();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open directory in native explorer
  const handleOpenFolder = async () => {
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: systemStatus?.downloadsDir })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Update yt-dlp binary
  const handleUpdateYtdlp = async () => {
    setUpdatingYtdlp(true);
    try {
      const res = await fetch('/api/system/update-ytdlp', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert('yt-dlp updated successfully:\n' + data.output);
        fetchSystemStatus();
      } else {
        alert('Update failed:\n' + data.error);
      }
    } catch (err: unknown) {
      alert('Update error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUpdatingYtdlp(false);
    }
  };

  const downloadingCount = jobs.filter(j => j.status === 'downloading').length;
  const queuedCount = jobs.filter(j => j.status === 'queued' || j.status === 'paused').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Header
        system={systemStatus}
        onUpdateYtdlp={handleUpdateYtdlp}
        updating={updatingYtdlp}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
          {[
            { 
              id: 'inspector', 
              label: 'Media Inspector', 
              icon: Search,
              badge: metadata ? '1 loaded' : undefined,
              badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            },
            { 
              id: 'presets', 
              label: 'Quick Presets', 
              icon: Zap 
            },
            { 
              id: 'options', 
              label: 'Advanced Matrix', 
              icon: SlidersHorizontal,
              badge: Object.keys(options).length > 0 ? `${Object.keys(options).length} set` : `${schemaData.totalOptions} flags`,
              badgeColor: Object.keys(options).length > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
            },
            {
              id: 'downloads',
              label: 'Download Queue',
              icon: Layers,
              badge: downloadingCount > 0 
                ? `${downloadingCount} active` 
                : queuedCount > 0 
                  ? `${queuedCount} queued` 
                  : jobs.length > 0 
                    ? `${jobs.length}` 
                    : undefined,
              badgeColor: downloadingCount > 0 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse' 
                : queuedCount > 0 
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                  : 'bg-slate-800 text-slate-400'
            },
            { 
              id: 'files', 
              label: 'Downloads Library', 
              icon: FolderOpen,
              badge: files.length > 0 ? `${files.length}` : undefined,
              badgeColor: 'bg-slate-800 text-slate-400'
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-500/50 shadow-lg shadow-indigo-600/25'
                    : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium leading-none ${tab.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Views */}
        <div className="space-y-6">
          {activeTab === 'inspector' && (
            <MediaInspector
              url={url}
              onUrlChange={setUrl}
              metadata={metadata}
              loading={inspectLoading}
              onInspect={handleInspect}
              selectedFormat={selectedFormatId}
              onSelectFormat={setSelectedFormatId}
            />
          )}

          {activeTab === 'presets' && (
            <QuickPresets
              onApplyPreset={handleApplyPreset}
              onQuickDownload={(name, opts) => handleAddToQueue(opts, `${name} - ${url}`)}
            />
          )}

          {activeTab === 'options' && (
            <OptionsExplorer
              categories={schemaData.categories}
              options={options}
              onChangeOption={handleChangeOption}
              onResetAll={() => setOptions({})}
            />
          )}

          {activeTab === 'downloads' && (
            <DownloadQueue
              jobs={jobs}
              isQueuePaused={isQueuePaused}
              maxConcurrent={maxConcurrent}
              onCancelJob={handleCancelJob}
              onPauseJob={handlePauseJob}
              onResumeJob={handleResumeJob}
              onRetryJob={handleRetryJob}
              onRemoveJob={handleRemoveJob}
              onReorderQueue={handleReorderQueue}
              onPauseAllQueue={handlePauseAllQueue}
              onResumeAllQueue={handleResumeAllQueue}
              onClearCompleted={handleClearCompleted}
              onClearAll={handleClearAll}
              onOpenFolder={handleOpenFolder}
            />
          )}

          {activeTab === 'files' && (
            <FileBrowser
              files={files}
              downloadsDir={systemStatus?.downloadsDir || 'Videos/AetherDL'}
              onOpenFolder={handleOpenFolder}
              onDeleteFile={handleDeleteFile}
              onRefresh={fetchFiles}
            />
          )}
        </div>

        {/* Live Command Preview Box - shown on configuration & preview tabs, hidden on Queue and Library */}
        {activeTab !== 'downloads' && activeTab !== 'files' && (
          <CommandPreview
            command={generatedCommand}
            onRun={() => handleAddToQueue()}
            loading={isStartingDownload}
            rawArgs={rawArgs}
            onRawArgsChange={setRawArgs}
          />
        )}
      </main>
    </div>
  );
}

export default App;
