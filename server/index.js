const express = require('express');
const cors = require('cors');
const http = require('http');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 4000;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

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
const jobs = new Map();
const history = [];

// Helper: Broadcast to all connected WebSocket clients
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  // Send active jobs snapshot and history on connect
  ws.send(JSON.stringify({
    type: 'init',
    jobs: Array.from(jobs.values()),
    history: history.slice(-50)
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
        const m = stdout2.match(/ffmpeg version ([^\s]+)/);
        ffmpegVersion = m ? m[1] : 'Installed';
      }

      res.json({
        ytdlp: {
          installed: !!ytdlpVersion,
          version: ytdlpVersion || 'Not detected'
        },
        ffmpeg: {
          installed: !!ffmpegVersion,
          version: ffmpegVersion || 'Not detected'
        },
        downloadsDir: DOWNLOADS_DIR,
        activeJobsCount: Array.from(jobs.values()).filter(j => j.status === 'downloading').length
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

// Generate command preview endpoint
app.post('/api/build-command', (req, res) => {
  const { url, options = {}, customArgs = '' } = req.body;
  const args = buildYtdlpArgs(url || 'https://...', options, customArgs);
  // Format for command line display
  const cmd = `yt-dlp ${args.slice(2).map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`;
  res.json({ command: cmd, args: args.slice(2) });
});

// Start a download job
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
    startTime: Date.now(),
    endTime: null,
    error: null,
    logs: [],
    command: `yt-dlp ${args.slice(2).map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`
  };

  jobs.set(jobId, job);
  broadcast({ type: 'job_added', job });

  // Spawn yt-dlp process
  const child = spawn('python', args);
  job.process = child;
  job.status = 'downloading';
  broadcast({ type: 'job_updated', job: sanitizeJob(job) });

  let lineBuffer = '';

  child.stdout.on('data', chunk => {
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop(); // keep remainder

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      job.logs.push({ time: new Date().toLocaleTimeString(), text: cleanLine, type: 'stdout' });
      if (job.logs.length > 500) job.logs.shift(); // bound log size

      // Parse custom progress template: download:[10.5%]|00:30|5.2MiB/s|45.0MiB|path/to/file.mp4
      if (cleanLine.startsWith('download:[')) {
        const parts = cleanLine.substring(9).split('|');
        if (parts.length >= 4) {
          const percentStr = parts[0].replace('%]', '').trim();
          const percent = parseFloat(percentStr) || 0;
          job.progress = Math.min(100, Math.max(0, percent));
          job.eta = parts[1] || '--:--';
          job.speed = parts[2] || '--/s';
          job.size = parts[3] || '--';
          if (parts[4]) {
            job.filename = path.basename(parts[4]);
          }
        }
      } else if (cleanLine.includes('[download]') && cleanLine.includes('%')) {
        // Standard yt-dlp fallback parse
        const m = cleanLine.match(/(\d+\.?\d*)%\s+of\s+(?:~\s*)?([^\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/);
        if (m) {
          job.progress = parseFloat(m[1]) || job.progress;
          job.size = m[2];
          job.speed = m[3];
          job.eta = m[4];
        }
      } else if (cleanLine.includes('[Merger]') || cleanLine.includes('[ExtractAudio]') || cleanLine.includes('[Fixup')) {
        job.speed = 'Processing...';
      } else if (cleanLine.startsWith('[download] Destination:')) {
        job.filename = path.basename(cleanLine.replace('[download] Destination:', '').trim());
      }

      broadcast({ type: 'job_progress', jobId, job: sanitizeJob(job) });
    });
  });

  child.stderr.on('data', chunk => {
    const text = chunk.toString().trim();
    if (text) {
      job.logs.push({ time: new Date().toLocaleTimeString(), text, type: 'stderr' });
      if (job.logs.length > 500) job.logs.shift();
      broadcast({ type: 'job_log', jobId, log: { time: new Date().toLocaleTimeString(), text, type: 'stderr' } });
    }
  });

  child.on('close', code => {
    job.endTime = Date.now();
    job.process = null;

    if (code === 0) {
      job.status = 'completed';
      job.progress = 100;
    } else {
      job.status = job.status === 'cancelled' ? 'cancelled' : 'failed';
      job.error = job.error || `Process exited with code ${code}`;
    }

    // Save to history
    history.push(sanitizeJob(job));
    broadcast({ type: 'job_completed', job: sanitizeJob(job) });
  });

  res.json({ success: true, jobId, job: sanitizeJob(job) });
});

// Cancel a download job
app.post('/api/cancel/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.process) {
    job.status = 'cancelled';
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${job.process.pid} /T /F`);
    } else {
      job.process.kill('SIGKILL');
    }
    broadcast({ type: 'job_updated', job: sanitizeJob(job) });
  }

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
