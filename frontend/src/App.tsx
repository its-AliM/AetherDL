import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MediaInspector } from './components/MediaInspector';
import { QuickPresets } from './components/QuickPresets';
import { OptionsExplorer } from './components/OptionsExplorer';
import { CommandPreview } from './components/CommandPreview';
import { DownloadQueue } from './components/DownloadQueue';
import { FileBrowser } from './components/FileBrowser';

import type { SystemStatus, MediaMetadata, DownloadJob, DownloadedFile, YtSchema } from './types';
import schemaDataRaw from './ytdlp_schema.json';

const schemaData = schemaDataRaw as YtSchema;

export function App() {
  const [activeTab, setActiveTab] = useState<'inspector' | 'presets' | 'options' | 'downloads' | 'files'>('inspector');
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [updatingYtdlp, setUpdatingYtdlp] = useState(false);

  // Form options state
  const [options, setOptions] = useState<Record<string, string | number | boolean | string[]>>({});
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [rawArgs, setRawArgs] = useState<string>('');
  const [generatedCommand, setGeneratedCommand] = useState<string>('yt-dlp');

  // Downloads state
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [files, setFiles] = useState<DownloadedFile[]>([]);
  const [isStartingDownload, setIsStartingDownload] = useState(false);

  // Fetch system status
  const fetchSystemStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system');
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch system status', e);
    }
  }, []);

  // Fetch downloaded files list
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (e) {
      console.error('Failed to fetch files', e);
    }
  }, []);

  // Update live preview command whenever URL/options change
  const updateCommandPreview = useCallback(async () => {
    const currentOptions = { ...options };
    if (selectedFormatId) {
      currentOptions['format'] = selectedFormatId;
    }

    try {
      const res = await fetch('/api/build-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url || 'https://...',
          options: currentOptions,
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

  // WebSocket for real-time download streaming
  useEffect(() => {
    fetchSystemStatus();
    fetchFiles();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host || 'localhost:4000'}`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'init') {
            setJobs(msg.jobs || []);
          } else if (msg.type === 'job_added') {
            setJobs(prev => [msg.job, ...prev]);
          } else if (msg.type === 'job_updated' || msg.type === 'job_progress') {
            setJobs(prev => prev.map(j => (j.id === (msg.jobId || msg.job?.id) ? { ...j, ...msg.job } : j)));
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
          }
        } catch (e) {
          console.error('WS parse error', e);
        }
      };
    } catch (e) {
      console.error('WS connect error', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [fetchSystemStatus, fetchFiles]);

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

  // Trigger Download
  const handleStartDownload = async (customOpts?: Record<string, string | number | boolean | string[]>, title?: string) => {
    if (!url.trim()) {
      alert('Please enter a media URL before starting download.');
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
        setActiveTab('downloads');
      } else {
        alert(data.error || 'Failed to start download');
      }
    } catch (err: unknown) {
      alert('Download error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsStartingDownload(false);
    }
  };

  // Cancel Download Job
  const handleCancelJob = async (jobId: string) => {
    try {
      await fetch(`/api/cancel/${jobId}`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  // Clear completed jobs from UI
  const handleClearCompleted = () => {
    setJobs(prev => prev.filter(j => j.status === 'downloading' || j.status === 'queued'));
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
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
          {[
            { id: 'inspector', label: 'Media Inspector & Formats' },
            { id: 'presets', label: 'Quick 1-Click Presets' },
            { id: 'options', label: `Complete Feature Matrix (${schemaData.totalOptions} flags)` },
            { id: 'downloads', label: `Active Queue (${jobs.filter(j => j.status === 'downloading').length})` },
            { id: 'files', label: `Media Library (${files.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
              onQuickDownload={(name, opts) => handleStartDownload(opts, `${name} - ${url}`)}
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
              onCancelJob={handleCancelJob}
              onClearCompleted={handleClearCompleted}
            />
          )}

          {activeTab === 'files' && (
            <FileBrowser
              files={files}
              downloadsDir={systemStatus?.downloadsDir || 'server/downloads'}
              onOpenFolder={handleOpenFolder}
              onDeleteFile={handleDeleteFile}
              onRefresh={fetchFiles}
            />
          )}
        </div>

        {/* Live Command Preview Box always anchored at bottom */}
        <CommandPreview
          command={generatedCommand}
          onRun={() => handleStartDownload()}
          loading={isStartingDownload}
          rawArgs={rawArgs}
          onRawArgsChange={setRawArgs}
        />
      </main>
    </div>
  );
}

export default App;
