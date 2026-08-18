<div align="center">

# ⚡ AetherDL

### Universal yt-dlp Media Studio & Next-Gen Command Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-Universal_Engine-red.svg?style=for-the-badge&logo=youtube)](https://github.com/yt-dlp/yt-dlp)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)

<p align="center">
  <b>AetherDL</b> is an ultra-modern, high-performance web interface engineered to unlock <b>100% of yt-dlp's capabilities</b>.<br/>
  Featuring real-time multi-threaded streaming, deep stream inspector, SponsorBlock automation, granular format filter builders, and live CLI command synthesis.
</p>

[Key Features](#-key-features) •
[Quick Start](#-quick-start) •
[Architecture](#-architecture) •
[yt-dlp Options Coverage](#-complete-yt-dlp-coverage) •
[REST & WebSocket API](#-api-reference) •
[Project Structure](#-project-structure)

---

</div>

## 🌟 Highlights

- **Exhaustive CLI Option Matrix**: Covers **300+ yt-dlp parameters** across 12 granular categories—from network proxies and subtitle embedding to SponsorBlock cuts and extractor arguments.
- **Deep Media Stream Inspector**: Instantly parses target URLs using `yt-dlp -J` to inspect all video/audio streams, bitrates, resolutions, codecs (AV1, VP9, H.264, Opus, AAC), audio languages, subtitles, and chapters.
- **Real-Time WebSocket Progress Pipeline**: Live byte-level speed meters, remaining ETA, animated percentage gauges, and streaming ANSI logs.
- **Interactive Command Synthesis**: Generates the exact, reproducible `yt-dlp` CLI command in real-time as you tweak UI controls.
- **Curated 1-Click Workflow Presets**: One-click workflows for 4K Max Quality, 1080p Standard MP4, Audiophile FLAC, 320kbps MP3 with embedded covers, SponsorBlock auto-cutting, and full playlist archival.
- **Integrated Download Manager & File Explorer**: Built-in file browser with direct browser playback, system file explorer integration, and batch queue management.

---

## 📸 Overview & Interface Preview

```
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │  ⚡ AetherDL                    [ yt-dlp: 2025.02.19 ]  [ FFmpeg: 7.1-full ]     │
 ├──────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                  │
 │  Target URL: [ https://www.youtube.com/watch?v=...                 ] [ INSPECT ] │
 │                                                                                  │
 │  ┌── Quick Presets ───────────────────────────────────────────────────────────┐  │
 │  │ [🎬 Best 4K/8K] [⚡ 1080p MP4] [🎵 320k MP3] [🎼 FLAC] [✂️ Sponsor Cut]    │  │
 │  └────────────────────────────────────────────────────────────────────────────┘  │
 │                                                                                  │
 │  ┌── Deep Options Explorer ───────────────────────────────────────────────────┐  │
 │  │ ⚙️ General & Network │ 📋 Filters & Playlist │ 🎨 Formats │ ✂️ Post-Process │  │
 │  │ 💬 Subtitles        │ 🖼️ Thumbnails/Metadata│ 🛡️ SponsorBlock │ 🔐 Auth     │  │
 │  └────────────────────────────────────────────────────────────────────────────┘  │
 │                                                                                  │
 │  ┌── Live Command Synthesizer ────────────────────────────────────────────────┐  │
 │  │ $ yt-dlp --format "bestvideo+bestaudio/best" --embed-subs --sponsorblock   │  │
 │  └────────────────────────────────────────────────────────────────────────────┘  │
 │                                                                                  │
 │  [ ▶ START DOWNLOAD ]                                                            │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### Prerequisites

Make sure the following tools are installed on your host system:
1. **Python 3.8+** with `yt-dlp` installed:
   ```bash
   pip install -U yt-dlp
   ```
2. **FFmpeg** installed and accessible in your system `PATH`:
   ```bash
   # Windows (via winget or chocolatey)
   winget install Gyan.FFmpeg
   # macOS (via Homebrew)
   brew install ffmpeg
   # Linux (Debian/Ubuntu)
   sudo apt install ffmpeg
   ```
3. **Node.js 18+** & **npm**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/aether-dl.git
cd aether-dl

# Install workspace dependencies
npm run install:all
```

### Running the Application

#### Production Mode (Recommended)
```bash
# Build the React application and start unified Node.js server
npm run build
npm start
```
Open **[http://localhost:4000](http://localhost:4000)** in your browser!

#### Development Mode
```bash
# Runs frontend with Vite HMR + backend concurrently
npm run dev
```
- Frontend UI: `http://localhost:5173`
- Backend API & WebSocket: `http://localhost:4000`

---

## 🎯 Complete yt-dlp Coverage

AetherDL provides first-class controls for all yt-dlp CLI options:

### 1. ⚙️ General & Network
- Network Proxies (`http://`, `socks5://`)
- Bandwidth Rate Limiting (`--limit-rate 5M`)
- Custom User-Agent & Referer Headers
- Socket timeout & retry parameters (`--retries`, `--fragment-retries`)
- IPv4 / IPv6 force binding

### 2. 📋 Video & Playlist Filtering
- Date filters (`--date`, `--datebefore`, `--dateafter`)
- View count & duration bounds (`--min-views`, `--max-filesize`)
- Playlist item range selector (`1,3,5:10`, `--playlist-reverse`)
- Break match criteria (`--break-on-existing`, `--break-per-input`)

### 3. 🎨 Video & Audio Formats
- Format selectors (`bestvideo+bestaudio/best`, `mp4/best`)
- Video codec constraints (`av01`, `vp9`, `avc1`, `hevc`)
- Audio codec constraints (`opus`, `m4a`, `flac`, `mp3`)
- Custom Format Sorting (`res:1080,fps,vcodec:vp9,acodec:opus`)

### 4. ✂️ Post-Processing & Audio Extraction
- Extract audio with automatic re-encoding (`mp3`, `flac`, `wav`, `opus`, `aac`, `m4a`, `vorbis`)
- Custom audio quality bitrates (`0` for VBR best, `320k`, `256k`, `128k`)
- Video Remuxing (`mp4`, `mkv`, `mov`, `avi`, `webm`)
- Custom FFmpeg arguments (`--postprocessor-args "ffmpeg:-af loudnorm"`)

### 5. 💬 Subtitles & Closed Captions
- Subtitle downloading (`--write-subs`, `--write-auto-subs`)
- Subtitle embedding directly into MP4/MKV containers
- Subtitle format conversion (`srt`, `vtt`, `ass`, `lrc`)
- Granular language selection (`en.*,es,fr,de,ja`)

### 6. 🖼️ Thumbnails & Metadata
- Embed thumbnail as cover art
- Atomic metadata tagging (`--embed-metadata`)
- Write JSON info files (`--write-info-json`)
- Split video by internal chapters (`--split-chapters`)

### 7. 🛡️ SponsorBlock Integration
- Mark or Remove sponsor categories:
  - `sponsor` (Sponsored promotions)
  - `intro` (Intermission / Intro animation)
  - `outro` (Endcards / Credits)
  - `selfpromo` (Self-promotion)
  - `interaction` (Subscribe reminders)
  - `preview` (Recaps / Previews)
  - `music_offtopic` (Non-music sections in music videos)
- Custom SponsorBlock API server endpoints

### 8. 🔐 Authentication & Cookies
- Browser cookie auto-extraction (Chrome, Firefox, Edge, Brave, Opera, Vivaldi, Safari)
- Netscape formatted cookies file support (`--cookies`)
- Username / Password authentication
- OAuth 2FA authentication token support

### 9. 🔧 Extractor Arguments & Advanced
- Custom Extractor Arguments (e.g. `youtube:player_client=ios,android;skip=dash`)
- External downloaders integration (`aria2c`, `ffmpeg`, `curl`, `wget`)
- Raw CLI flag injector for experimental arguments

---

## 🏗️ Architecture

```
aether-dl/
├── frontend/                     # React 18 SPA (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/          # Modular UI components
│   │   │   ├── Header.tsx       # System status & version monitor
│   │   │   ├── QuickPresets.tsx # 1-click curated workflows
│   │   │   ├── MediaInspector.tsx # Format discovery & deep inspector
│   │   │   ├── OptionsExplorer.tsx # 300+ searchable yt-dlp options
│   │   │   ├── CommandPreview.tsx # Live CLI command synthesizer
│   │   │   ├── DownloadQueue.tsx  # WebSocket live progress & streaming logs
│   │   │   └── FileBrowser.tsx  # Downloaded media manager
│   │   ├── optionsSchema.json   # Deep categorized yt-dlp parameter schema
│   │   ├── types.ts             # TypeScript domain definitions
│   │   └── utils.ts             # Command builders & formatters
│   └── dist/                    # Compiled SPA bundle
│
├── server/                      # Node.js + Express + WebSocket backend
│   ├── downloads/               # Target directory for downloaded media
│   └── index.js                 # REST endpoints & yt-dlp process manager
│
├── tools/                       # Tooling & Schema Generators
│   ├── parse_schema.py          # Extracts all flags from yt-dlp --help
│   └── enrich_schema.py         # Enriches options with UI schemas & types
│
└── package.json                 # Monorepo orchestration scripts
```

---

## 🔌 API Reference

### REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` or `/api/system` | Get yt-dlp & FFmpeg installation status and versions |
| `POST` | `/api/update-ytdlp` | Trigger `yt-dlp -U` update process |
| `POST` | `/api/inspect` | Inspect URL metadata & available stream formats |
| `POST` | `/api/build-command` | Validate options & preview raw generated CLI command |
| `POST` | `/api/download` | Queue a new download task |
| `GET` | `/api/jobs` | Retrieve all current, active, and completed jobs |
| `POST` | `/api/cancel/:jobId` | Cancel an active download task |
| `GET` | `/api/files` | List all downloaded media files |
| `GET` | `/downloads/:filename` | Stream/download completed media file |
| `DELETE` | `/api/files/:filename` | Delete a downloaded file |
| `POST` | `/api/open-folder` | Open the downloads directory in host OS file manager |

### WebSocket Protocol

Connect to `ws://localhost:4000` to receive real-time events:

```json
{
  "type": "job_progress",
  "jobId": "job_1740000000000_abcde",
  "job": {
    "progress": 68.4,
    "speed": "14.2MiB/s",
    "eta": "00:18",
    "size": "145.2MiB",
    "filename": "video.mp4"
  }
}
```

```json
{
  "type": "job_log",
  "jobId": "job_1740000000000_abcde",
  "log": {
    "type": "stdout",
    "text": "[download] 68.4% of 145.20MiB at 14.20MiB/s ETA 00:18"
  }
}
```

---

## 🛠️ Advanced: Regenerating Options Schema

To automatically synchronize options with the newest `yt-dlp` release:

```bash
npm run schema:generate
```

This runs the automated AST parser and enriches all options, types, default values, and groupings directly into `frontend/src/optionsSchema.json`.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
AetherDL is an independent tool and is not affiliated with Google, YouTube, or yt-dlp. Always comply with the terms of service of media providers and applicable copyright laws.
