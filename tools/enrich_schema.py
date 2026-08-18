import json
import re

def enrich_schema(schema_path):
    with open(schema_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Specific presets & common options with rich metadata
    special_fields = {
        # Formats
        "format": {
            "title": "Video/Audio Format Selector",
            "widget": "format_selector",
            "quickOptions": [
                {"label": "Best Video + Best Audio (Default)", "value": "bestvideo+bestaudio/best"},
                {"label": "Best Audio Only (Lossless/High)", "value": "bestaudio/best"},
                {"label": "Best MP4 Video (H.264/AAC for compatibility)", "value": "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b"},
                {"label": "1080p Max (Save Bandwidth)", "value": "bv*[height<=1080]+ba/b[height<=1080]"},
                {"label": "720p Max", "value": "bv*[height<=720]+ba/b[height<=720]"},
                {"label": "4K Max (2160p)", "value": "bv*[height<=2160]+ba/b[height<=2160]"},
                {"label": "Worst / Lowest Quality (Fastest)", "value": "worstvideo+worstaudio/worst"}
            ]
        },
        "extract-audio": {
            "title": "Extract Audio Only",
            "widget": "switch"
        },
        "audio-format": {
            "title": "Audio Format Conversion",
            "widget": "select",
            "options": ["best", "aac", "alac", "flac", "m4a", "mp3", "opus", "vorbis", "wav"]
        },
        "audio-quality": {
            "title": "Audio Quality (Bitrate / VBR)",
            "widget": "select",
            "options": ["0 (Best VBR ~250k)", "1", "2", "3", "4", "5 (Default)", "6", "7", "8", "9 (Worst)", "320k (CBR)", "256k (CBR)", "192k (CBR)", "128k (CBR)"]
        },
        "remux-video": {
            "title": "Remux Video Container",
            "widget": "select",
            "options": ["mp4", "mkv", "mov", "avi", "flv", "webm"]
        },
        "merge-output-format": {
            "title": "Merge Output Format",
            "widget": "select",
            "options": ["mp4", "mkv", "ogg", "webm", "flv"]
        },
        "cookies-from-browser": {
            "title": "Extract Cookies from Browser",
            "widget": "select",
            "options": ["chrome", "firefox", "edge", "brave", "opera", "safari", "vivaldi", "chromium"]
        },
        "sub-langs": {
            "title": "Subtitle Languages (Regex/CSV)",
            "widget": "text",
            "placeholder": "e.g. en.*,es,fr,all"
        },
        "write-subs": {
            "title": "Download Subtitles",
            "widget": "switch"
        },
        "write-auto-subs": {
            "title": "Download Auto-Generated Subtitles",
            "widget": "switch"
        },
        "embed-subs": {
            "title": "Embed Subtitles into Video",
            "widget": "switch"
        },
        "embed-thumbnail": {
            "title": "Embed Thumbnail as Cover Art",
            "widget": "switch"
        },
        "embed-metadata": {
            "title": "Embed Metadata / Tags",
            "widget": "switch"
        },
        "embed-chapters": {
            "title": "Embed Chapter Markers",
            "widget": "switch"
        },
        "split-chapters": {
            "title": "Split Video by Chapters",
            "widget": "switch"
        },
        "sponsorblock-mark": {
            "title": "SponsorBlock Categories to Mark",
            "widget": "multiselect",
            "options": ["all", "sponsor", "intro", "outro", "selfpromo", "preview", "filler", "interaction", "music_offtopic"]
        },
        "sponsorblock-remove": {
            "title": "SponsorBlock Categories to Cut/Remove",
            "widget": "multiselect",
            "options": ["all", "sponsor", "intro", "outro", "selfpromo", "preview", "filler", "interaction", "music_offtopic"]
        },
        "downloader": {
            "title": "External Downloader Engine",
            "widget": "select",
            "options": ["native", "aria2c", "avconv", "axel", "curl", "ffmpeg", "httpie", "wget"]
        },
        "concurrent-fragments": {
            "title": "Concurrent Fragment Downloads (Threads)",
            "widget": "number",
            "placeholder": "e.g. 5 or 10"
        },
        "paths": {
            "title": "Download Directory Path",
            "widget": "path"
        },
        "output": {
            "title": "Output Filename Template",
            "widget": "template",
            "placeholder": "%(title)s [%(id)s].%(ext)s"
        },
        "download-sections": {
            "title": "Download Specific Time Section / Range",
            "widget": "text",
            "placeholder": "e.g. *10:15-15:00 or *intro"
        },
        "limit-rate": {
            "title": "Rate Limit / Max Speed",
            "widget": "text",
            "placeholder": "e.g. 50K or 4.2M"
        },
        "playlist-items": {
            "title": "Playlist Items / Range",
            "widget": "text",
            "placeholder": "e.g. 1,2,5,10-20,last-3"
        }
    }

    category_icons = {
        "General": "Settings",
        "Network & Proxy": "Globe",
        "Geo-Restriction": "ShieldCheck",
        "Video & Playlist Selection": "ListFilter",
        "Download & Rate Limiting": "DownloadCloud",
        "Filesystem & Paths": "FolderSync",
        "Thumbnails": "Image",
        "Internet Shortcuts": "Link",
        "Verbosity & Simulation": "Terminal",
        "Workarounds & Fixes": "Wrench",
        "Video & Audio Formats": "Sliders",
        "Subtitles & Closed Captions": "Subtitles",
        "Authentication & Cookies": "KeyRound",
        "Post-Processing & FFmpeg": "Cpu",
        "SponsorBlock": "Scissors",
        "Extractor Options & Arguments": "Plug"
    }

    for cat in data['categories']:
        cat['icon'] = category_icons.get(cat['label'], "Folder")
        for opt in cat['options']:
            opt_id = opt['id']
            if opt_id in special_fields:
                spec = special_fields[opt_id]
                for k, v in spec.items():
                    opt[k] = v

    with open('frontend/src/ytdlp_schema.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print("Exported enriched schema to frontend/src/ytdlp_schema.json")

enrich_schema('ytdlp_schema.json')
