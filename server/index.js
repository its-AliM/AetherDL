const express = require('express');
const cors = require('cors');
const http = require('http');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 4000;
// Default download destination: (%username%)\Videos\AetherDL
const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || path.join(os.homedir(), 'Videos', 'AetherDL');

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/downloads', express.static(DOWNLOADS_DIR));

// Serve frontend production build if available
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}

// Track active jobs and download history
// Jobs map: jobId => job object
// Queue array: list of jobIds waiting to be processed
const jobs = new Map();
const queue = [];
const history = [];

let maxConcurrent = 2;
let isQueuePaused = false;

// Helper: Broadcast to all connected WebSocket clients
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function getQueueSnapshot() {
  return {
    jobs: Array.from(jobs.values()).map(sanitizeJob),
    queueOrder: [...queue],
    history: history.slice(-50),
    maxConcurrent,
    isPaused: isQueuePaused
  };
}

// Helper: Count actively downloading jobs
function getActiveDownloadingCount() {
  let count = 0;
  for (const job of jobs.values()) {
    if (job.status === 'downloading') {
      count++;
    }
  }
  return count;
}

// Queue runner: process next queued items up to maxConcurrent
function processQueue() {
  if (isQueuePaused) return;

  while (getActiveDownloadingCount() < maxConcurrent && queue.length > 0) {
    const nextJobId = queue.shift();
    const job = jobs.get(nextJobId);
    if (!job) continue;

    if (job.status === 'queued') {
      startJobProcess(job);
    }
  }
}

function startJobProcess(job) {
  const args = buildYtdlpArgs(job.url, job.options || {}, job.customArgs || '');
  const child = spawn('python', args);

  job.process = child;
  job.status = 'downloading';
  job.startTime = job.startTime || Date.now();
  job.command = `yt-dlp ${args.slice(2).map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`;

  broadcast({ type: 'job_updated', job: sanitizeJob(job) });

  let lineBuffer = '';

  child.stdout.on('data', chunk => {
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop(); // keep remainder

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      // Check if line is a progress update from custom progress-template or default yt-dlp format
      // Examples:
      // download:[  7.1%]|13:47| 538.91KiB/s| 468.75MiB|D:\...\file.mp4
      // [  7.1%]|13:47| 538.91KiB/s| 468.75MiB|D:\...\file.mp4
      // [download]   7.1% of  468.75MiB at  538.91KiB/s ETA 13:47
      const isProgressTemplate = /^(?:download:)?\[\s*(\d+\.?\d*)%\]\s*\|([^|]*)\|([^|]*)\|([^|]*)(?:\|(.*))?$/.test(cleanLine);
      const isStandardDlProgress = /\[download\]\s+(\d+\.?\d*)%/.test(cleanLine);

      if (isProgressTemplate) {
        const m = cleanLine.match(/^(?:download:)?\[\s*(\d+\.?\d*)%\]\s*\|([^|]*)\|([^|]*)\|([^|]*)(?:\|(.*))?$/);
        if (m) {
          const percent = parseFloat(m[1]) || 0;
          job.progress = Math.min(100, Math.max(0, percent));
          job.eta = (m[2] || '').trim() || '--:--';
          job.speed = (m[3] || '').trim() || '--/s';
          job.size = (m[4] || '').trim() || '--';
          if (m[5] && m[5].trim()) {
            job.filename = path.basename(m[5].trim());
          }
          broadcast({ type: 'job_progress', jobId: job.id, job: sanitizeJob(job) });
          // Progress lines are not added to logs to keep log console clean and legible
          return;
        }
      } else if (isStandardDlProgress) {
        const m = cleanLine.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+(?:~\s*)?([^\s]+)(?:\s+at\s+([^\s]+))?(?:\s+ETA\s+([^\s]+))?/);
        if (m) {
          job.progress = parseFloat(m[1]) || job.progress;
          if (m[2]) job.size = m[2].trim();
          if (m[3]) job.speed = m[3].trim();
          if (m[4]) job.eta = m[4].trim();
          broadcast({ type: 'job_progress', jobId: job.id, job: sanitizeJob(job) });
          // Progress lines are not added to logs to keep log console clean
          return;
        }
      } else if (cleanLine.includes('[Merger]') || cleanLine.includes('[ExtractAudio]') || cleanLine.includes('[Fixup')) {
        job.speed = 'Processing...';
      } else if (cleanLine.startsWith('[download] Destination:')) {
        job.filename = path.basename(cleanLine.replace('[download] Destination:', '').trim());
      }

      // Record informative and non-progress stdout logs
      const logEntry = { time: new Date().toLocaleTimeString(), text: cleanLine, type: 'stdout' };
      job.logs.push(logEntry);
      if (job.logs.length > 500) job.logs.shift(); // bound log size

      broadcast({ type: 'job_progress', jobId: job.id, job: sanitizeJob(job) });
    });
  });

  child.stderr.on('data', chunk => {
    const text = chunk.toString().trim();
    if (text) {
      job.logs.push({ time: new Date().toLocaleTimeString(), text, type: 'stderr' });
      if (job.logs.length > 500) job.logs.shift();
      broadcast({ type: 'job_log', jobId: job.id, log: { time: new Date().toLocaleTimeString(), text, type: 'stderr' } });
    }
  });

  child.on('close', code => {
    job.endTime = Date.now();
    job.process = null;

    if (code === 0) {
      job.status = 'completed';
      job.progress = 100;
    } else {
      job.status = job.status === 'cancelled' ? 'cancelled' : (job.status === 'paused' ? 'paused' : 'failed');
      if (job.status === 'failed') {
        job.error = job.error || `Process exited with code ${code}`;
      }
    }

    // Save to history if completed or failed
    if (job.status === 'completed' || job.status === 'failed') {
      history.push(sanitizeJob(job));
    }

    broadcast({ type: 'job_completed', job: sanitizeJob(job) });

    // Process next item in queue
    processQueue();
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  // Send active jobs snapshot and history on connect
  ws.send(JSON.stringify({
    type: 'init',
    jobs: Array.from(jobs.values()).map(sanitizeJob),
    queueOrder: [...queue],
    history: history.slice(-50),
    maxConcurrent,
    isPaused: isQueuePaused
  }));
});

// Check system tools
app.get(['/api/system', '/api/status'], (req, res) => {
  let ytdlpVersion = null;
  let ffmpegVersion = null;

  exec('python -m yt_dlp --version', (err1, stdout1) => {
    if (!err1 && stdout1) ytdlpVersion = stdout1.trim();

    exec('ffmpeg -version', (err2, stdout2) => {
      if (!err2 && stdout2) {
        const match = stdout2.match(/ffmpeg version ([^\s]+)/);
        ffmpegVersion = match ? match[1] : 'installed';
      }

      res.json({
        ytdlp: {
          installed: !!ytdlpVersion,
          version: ytdlpVersion
        },
        ffmpeg: {
          installed: !!ffmpegVersion,
          version: ffmpegVersion
        },
        downloadsDir: DOWNLOADS_DIR,
        activeJobsCount: getActiveDownloadingCount(),
        queuedCount: queue.length,
        isQueuePaused,
        maxConcurrent
      });
    });
  });
});

// Update yt-dlp to latest
app.post('/api/system/update-ytdlp', (req, res) => {
  exec('python -m pip install -U yt-dlp', (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: stderr || err.message });
    }
    res.json({ success: true, output: stdout });
  });
});

// Inspect media formats & metadata using -J (--dump-single-json)
app.post('/api/inspect', (req, res) => {
  const { url, extraArgs = [] } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const args = ['-m', 'yt_dlp', '--dump-single-json', '--no-playlist', ...extraArgs, url];
  const py = spawn('python', args);

  let stdout = '';
  let stderr = '';

  py.stdout.on('data', data => { stdout += data.toString(); });
  py.stderr.on('data', data => { stderr += data.toString(); });

  py.on('close', code => {
    if (code !== 0) {
      return res.status(400).json({ error: stderr || 'Failed to inspect URL' });
    }
    try {
      const data = JSON.parse(stdout);
      
      // Clean and organize format information
      const formats = (data.formats || []).map(f => ({
        format_id: f.format_id,
        ext: f.ext,
        resolution: f.resolution || (f.width ? `${f.width}x${f.height}` : 'audio only'),
        fps: f.fps,
        vcodec: f.vcodec,
        acodec: f.acodec,
        filesize: f.filesize || f.filesize_approx,
        tbr: f.tbr,
        vbr: f.vbr,
        abr: f.abr,
        format_note: f.format_note,
        dynamic_range: f.dynamic_range,
        container: f.container,
        protocol: f.protocol,
        is_video: f.vcodec && f.vcodec !== 'none',
        is_audio: f.acodec && f.acodec !== 'none'
      }));

      // Subtitles
      const subtitles = Object.keys(data.subtitles || {});
      const autoSubtitles = Object.keys(data.automaticcaptions || data.automatic_captions || {});
      const chapters = (data.chapters || []).map(c => ({
        title: c.title,
        start_time: c.start_time,
        end_time: c.end_time
      }));

      res.json({
        id: data.id,
        title: data.title,
        description: data.description,
        thumbnail: data.thumbnail,
        thumbnails: data.thumbnails,
        duration: data.duration,
        duration_string: data.duration_string,
        uploader: data.uploader,
        uploader_url: data.uploader_url,
        view_count: data.view_count,
        like_count: data.like_count,
        upload_date: data.upload_date,
        tags: data.tags || [],
        webpage_url: data.webpage_url,
        extractor: data.extractor,
        formats: formats.reverse(), // Best first
        subtitles,
        autoSubtitles,
        chapters
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse JSON response: ' + e.message });
    }
  });
});

// Construct CLI args from structured options
function buildYtdlpArgs(url, options = {}, customArgs = '') {
  const args = ['-m', 'yt_dlp', '--newline', '--progress-template', 'download:[%(progress._percent_str)s]|%(progress._eta_str)s|%(progress._speed_str)s|%(progress._total_bytes_str)s|%(progress.filename)s'];

  // Default directory
  const downloadPath = options['paths'] || options['path'] || DOWNLOADS_DIR;
  args.push('-P', downloadPath);

  // Parse structured key-value options
  for (const [key, val] of Object.entries(options)) {
    if (val === undefined || val === null || val === false || val === '' || key === 'paths' || key === 'path') {
      continue;
    }
    const flag = key.startsWith('-') ? key : `--${key}`;

    if (val === true) {
      args.push(flag);
    } else if (Array.isArray(val)) {
      if (val.length > 0) {
        args.push(flag, val.join(','));
      }
    } else {
      args.push(flag, String(val));
    }
  }

  // Parse custom raw args if provided
  if (customArgs && customArgs.trim()) {
    const rawTokens = customArgs.trim().match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    rawTokens.forEach(t => {
      args.push(t.replace(/^"|"$/g, ''));
    });
  }

  // Add the URL
  if (url) {
    args.push(url);
  }
  return args;
}

// Generate command preview endpoint (support both /api/build-command and /api/preview-command)
function handleBuildCommand(req, res) {
  const { url, options = {}, customArgs = '' } = req.body || {};
  const args = buildYtdlpArgs(url || 'https://...', options, customArgs);
  // Format for command line display
  const cmd = `yt-dlp ${args.slice(2).map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`;
  res.json({ command: cmd, args: args.slice(2) });
}

app.post('/api/build-command', handleBuildCommand);
app.post('/api/preview-command', handleBuildCommand);

// Get current jobs and queue state
app.get('/api/jobs', (req, res) => {
  res.json(getQueueSnapshot());
});

// Add a download job to queue (or start immediately if under concurrency limit)
app.post('/api/download', (req, res) => {
  const { url, options = {}, customArgs = '', title = 'Downloading media...' } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const args = buildYtdlpArgs(url, options, customArgs);
  const downloadPath = options['paths'] || options['path'] || DOWNLOADS_DIR;

  const job = {
    id: jobId,
    url,
    title: title,
    status: 'queued',
    progress: 0,
    eta: '--:--',
    speed: '--/s',
    size: '--',
    filename: '',
    downloadPath,
    options,
    customArgs,
    startTime: null,
    endTime: null,
    error: null,
    logs: [],
    command: `yt-dlp ${args.slice(2).map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`
  };

  jobs.set(jobId, job);
  queue.push(jobId);

  broadcast({ type: 'job_added', job: sanitizeJob(job), queueOrder: [...queue] });

  // Trigger queue runner
  processQueue();

  res.json({ success: true, jobId, job: sanitizeJob(job), queueOrder: [...queue] });
});

// Pause all queue processing
app.post(['/api/queue/pause', '/api/queue/pause-all'], (req, res) => {
  isQueuePaused = true;
  broadcast({ type: 'queue_state', isPaused: true });
  res.json({ success: true, isPaused: true });
});

// Resume queue processing
app.post(['/api/queue/resume', '/api/queue/resume-all'], (req, res) => {
  isQueuePaused = false;
  broadcast({ type: 'queue_state', isPaused: false });
  processQueue();
  res.json({ success: true, isPaused: false });
});

// Update queue concurrency settings
app.post('/api/queue/config', (req, res) => {
  const { maxConcurrent: newMax } = req.body;
  if (typeof newMax === 'number' && newMax >= 1 && newMax <= 10) {
    maxConcurrent = newMax;
    broadcast({ type: 'queue_config', maxConcurrent });
    processQueue();
    return res.json({ success: true, maxConcurrent });
  }
  res.status(400).json({ error: 'Invalid maxConcurrent value (must be 1-10)' });
});

// Clear completed, cancelled, and failed jobs from queue list
app.post('/api/queue/clear-finished', (req, res) => {
  const finishedIds = [];
  for (const [id, job] of jobs.entries()) {
    if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'failed') {
      finishedIds.push(id);
      jobs.delete(id);
    }
  }
  broadcast({ type: 'jobs_cleared', clearedIds: finishedIds, ...getQueueSnapshot() });
  res.json({ success: true, clearedCount: finishedIds.length });
});

// Clear everything that is not actively downloading
app.post('/api/queue/clear-all', (req, res) => {
  const removedIds = [];
  // Remove queued items
  while (queue.length > 0) {
    const id = queue.shift();
    jobs.delete(id);
    removedIds.push(id);
  }
  // Remove non-active jobs
  for (const [id, job] of jobs.entries()) {
    if (job.status !== 'downloading') {
      removedIds.push(id);
      jobs.delete(id);
    }
  }
  broadcast({ type: 'queue_reset', ...getQueueSnapshot() });
  res.json({ success: true, removedCount: removedIds.length });
});

// Reorder queued items
app.post('/api/queue/reorder', (req, res) => {
  const newOrder = req.body.queueIds || req.body.newOrder;
  if (!Array.isArray(newOrder)) {
    return res.status(400).json({ error: 'newOrder or queueIds must be an array of job IDs' });
  }
  // Filter only IDs that are currently queued
  const validQueuedIds = new Set(queue);
  const reordered = newOrder.filter(id => validQueuedIds.has(id));
  // Append any missed queued IDs at the end
  queue.forEach(id => {
    if (!reordered.includes(id)) {
      reordered.push(id);
    }
  });

  queue.length = 0;
  queue.push(...reordered);

  broadcast({ type: 'queue_reordered', queueOrder: [...queue] });
  res.json({ success: true, queueOrder: [...queue] });
});

// Retry a failed/cancelled job
app.post(['/api/retry/:jobId', '/api/queue/retry/:jobId'], (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Reset job state
  job.status = 'queued';
  job.progress = 0;
  job.eta = '--:--';
  job.speed = '--/s';
  job.size = '--';
  job.error = null;
  job.startTime = null;
  job.endTime = null;
  job.logs.push({ time: new Date().toLocaleTimeString(), text: 'Download re-queued for retry.', type: 'stdout' });

  if (!queue.includes(jobId)) {
    queue.push(jobId);
  }

  broadcast({ type: 'job_updated', job: sanitizeJob(job), queueOrder: [...queue] });
  processQueue();
  res.json({ success: true, job: sanitizeJob(job) });
});

// Pause a specific job
app.post(['/api/pause/:jobId', '/api/queue/pause/:jobId'], (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // If in queue, remove from queue
  const qIdx = queue.indexOf(jobId);
  if (qIdx !== -1) {
    queue.splice(qIdx, 1);
  }

  job.status = 'paused';

  if (job.process) {
    const pid = job.process.pid;
    job.process = null; // Detach before killing to avoid triggering failure handler
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${pid} /T /F`);
      } else {
        process.kill(pid, 'SIGTERM');
      }
    } catch (e) {
      console.error('Error stopping process for pause:', e);
    }
  }

  broadcast({ type: 'job_updated', job: sanitizeJob(job), queueOrder: [...queue] });
  processQueue();
  res.json({ success: true, job: sanitizeJob(job) });
});

// Resume a specific paused job
app.post(['/api/resume/:jobId', '/api/queue/resume/:jobId'], (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  job.status = 'queued';
  job.error = null;
  job.logs.push({ time: new Date().toLocaleTimeString(), text: 'Resuming download...', type: 'stdout' });
  if (!queue.includes(jobId)) {
    queue.push(jobId);
  }

  broadcast({ type: 'job_updated', job: sanitizeJob(job), queueOrder: [...queue] });
  processQueue();
  res.json({ success: true, job: sanitizeJob(job) });
});

// Remove a job from queue or delete entirely
app.all(['/api/jobs/:jobId', '/api/queue/remove/:jobId'], (req, res) => {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // If running, kill process
  if (job.process) {
    const pid = job.process.pid;
    job.status = 'cancelled';
    job.process = null;
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${pid} /T /F`);
      } else {
        process.kill(pid, 'SIGKILL');
      }
    } catch (e) {
      console.error('Error killing process on remove:', e);
    }
  }

  // Remove from queue
  const qIdx = queue.indexOf(jobId);
  if (qIdx !== -1) {
    queue.splice(qIdx, 1);
  }

  jobs.delete(jobId);
  broadcast({ type: 'job_removed', jobId, ...getQueueSnapshot() });
  processQueue();
  res.json({ success: true });
});

// Cancel a download job
app.post(['/api/cancel/:jobId', '/api/queue/cancel/:jobId'], (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // If in queue, remove
  const qIdx = queue.indexOf(jobId);
  if (qIdx !== -1) {
    queue.splice(qIdx, 1);
  }

  job.status = 'cancelled';
  if (job.process) {
    const pid = job.process.pid;
    job.process = null;
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${pid} /T /F`);
      } else {
        process.kill(pid, 'SIGKILL');
      }
    } catch (e) {
      console.error('Error killing process on cancel:', e);
    }
  }

  broadcast({ type: 'job_updated', job: sanitizeJob(job), queueOrder: [...queue] });
  processQueue();
  res.json({ success: true });
});

// List downloaded files in downloads directory
app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync(DOWNLOADS_DIR).map(name => {
      const filePath = path.join(DOWNLOADS_DIR, name);
      const stat = fs.statSync(filePath);
      return {
        name,
        size: stat.size,
        mtime: stat.mtime,
        isFile: stat.isFile(),
        url: `/downloads/${encodeURIComponent(name)}`
      };
    }).filter(f => f.isFile).sort((a, b) => b.mtime - a.mtime);

    res.json({ files, count: files.length, dir: DOWNLOADS_DIR });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a downloaded file
app.delete('/api/files/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(DOWNLOADS_DIR, path.basename(filename));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Open folder in system file explorer
app.post('/api/open-folder', (req, res) => {
  const { folderPath } = req.body;
  const target = folderPath || DOWNLOADS_DIR;

  let cmd = '';
  if (process.platform === 'win32') {
    cmd = `explorer "${target}"`;
  } else if (process.platform === 'darwin') {
    cmd = `open "${target}"`;
  } else {
    cmd = `xdg-open "${target}"`;
  }

  exec(cmd, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Remove cyclical process reference before serializing job
function sanitizeJob(job) {
  const { process, ...sanitized } = job;
  return sanitized;
}

// Start server
server.listen(PORT, () => {
  console.log(`Backend API & WebSocket server running on http://localhost:${PORT}`);
  console.log(`Downloads directory: ${DOWNLOADS_DIR}`);
});
