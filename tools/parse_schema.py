import json
import re

def parse_ytdlp_help(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    section_titles = [
        ('General Options', 'General', 'Core settings, configuration files, updates, abort on error, and basic controls'),
        ('Network Options', 'Network & Proxy', 'Proxies, timeouts, socket binding, user agents, and IP protocols'),
        ('Geo-restriction', 'Geo-Restriction', 'Country bypass, geo verification proxy, and IP spoofing headers'),
        ('Video Selection', 'Video & Playlist Selection', 'Item filtering, playlist ranges, date filtering, match filters, and views'),
        ('Download Options', 'Download & Rate Limiting', 'Download limits, retries, concurrent fragments, buffer sizes, and external downloaders (aria2c, etc.)'),
        ('Filesystem Options', 'Filesystem & Paths', 'Output template, download directories, paths, temp files, and overwriting behavior'),
        ('Thumbnail Options', 'Thumbnails', 'Download, embed, format selection, and thumbnail conversion'),
        ('Internet Shortcut Options', 'Internet Shortcuts', 'Create .url, .webloc, and .desktop shortcuts'),
        ('Verbosity and Simulation Options', 'Verbosity & Simulation', 'Simulation modes, dump JSON, verbose logs, progress bar styles, and console outputs'),
        ('Workarounds', 'Workarounds & Fixes', 'Encoding, referrers, legacy server workarounds, YouTube sleep intervals, and client impersonation'),
        ('Video Format Options', 'Video & Audio Formats', 'Format selection syntax (-f), quality sorting, audio extraction, merge formats, and codecs'),
        ('Subtitle Options', 'Subtitles & Closed Captions', 'Subtitles download, auto-subs, translation, embed subtitles, and subtitle formats'),
        ('Authentication Options', 'Authentication & Cookies', 'Credentials, browser cookies (Chrome, Firefox, Edge, etc.), OAuth2, and netrc'),
        ('Post-Processing Options', 'Post-Processing & FFmpeg', 'FFmpeg location, audio conversion/bitrate, video remuxing, chapters, metadata, and sponsorblock'),
        ('SponsorBlock Options', 'SponsorBlock', 'Skip or mark sponsored segments, intros, outros, and self-promotions'),
        ('Extractor Options', 'Extractor Options & Arguments', 'Site-specific extractor arguments, YouTube API clients (ios, android, web), and credentials')
    ]

    # Map line ranges to sections
    section_ranges = []
    for i, line in enumerate(lines):
        line_clean = line.rstrip()
        for title, cat_id, cat_desc in section_titles:
            if line_clean == f"  {title}:":
                section_ranges.append((i, title, cat_id, cat_desc))
                break

    categories = []
    all_options = []

    for idx, (start_idx, title, cat_id, cat_desc) in enumerate(section_ranges):
        end_idx = section_ranges[idx + 1][0] if idx + 1 < len(section_ranges) else len(lines)
        section_lines = lines[start_idx + 1:end_idx]

        cat_options = []
        current_opt = None

        for line in section_lines:
            # Option pattern:
            #   -U, --update                       Update this program to the latest version
            #   --proxy URL                        Use the specified HTTP/HTTPS/SOCKS proxy
            #   --sponsorblock-mark CATS           ...
            #   --compat-options OPTS              ...
            m = re.match(r'^\s{4}(?:(-[a-zA-Z0-9]),\s+)?(--[a-zA-Z0-9_-]+)(?:\[=([^\]]+)\]|\s+([A-Z0-9_\[\],/:-]+))?(?:\s{2,}(.*))?$', line)
            
            if m:
                if current_opt:
                    cat_options.append(current_opt)
                    all_options.append(current_opt)

                short_flag = m.group(1)
                long_flag = m.group(2)
                optional_arg = m.group(3)
                arg_name = m.group(4) or optional_arg
                raw_desc = (m.group(5) or '').strip()

                name = long_flag.lstrip('-')
                # Determine type
                opt_type = 'boolean'
                if arg_name:
                    if 'NUMBER' in arg_name or 'SIZE' in arg_name or 'COUNT' in arg_name or 'RATE' in arg_name or 'SECONDS' in arg_name:
                        opt_type = 'string'
                    elif 'PATH' in arg_name or 'DIR' in arg_name or 'FILE' in arg_name:
                        opt_type = 'path'
                    elif 'FORMAT' in arg_name or 'TEMPLATE' in arg_name:
                        opt_type = 'template'
                    else:
                        opt_type = 'string'

                current_opt = {
                    'id': name,
                    'short': short_flag,
                    'long': long_flag,
                    'category': cat_id,
                    'argName': arg_name,
                    'hasArg': bool(arg_name),
                    'optionalArg': bool(optional_arg),
                    'type': opt_type,
                    'description': raw_desc,
                    'defaultValue': None
                }
            elif current_opt and line.startswith(' ' * 8):
                # Continuation of description
                continuation = line.strip()
                if continuation:
                    current_opt['description'] += ' ' + continuation

        if current_opt:
            cat_options.append(current_opt)
            all_options.append(current_opt)

        categories.append({
            'name': title,
            'label': cat_id,
            'description': cat_desc,
            'count': len(cat_options),
            'options': cat_options
        })

    return {
        'version': '2026.07.04',
        'totalOptions': len(all_options),
        'categories': categories
    }

if __name__ == '__main__':
    data = parse_ytdlp_help('ytdlp_help.txt')
    print(f"Parsed {data['totalOptions']} options across {len(data['categories'])} categories")
    for cat in data['categories']:
        print(f" - {cat['label']}: {cat['count']} options")
    
    with open('ytdlp_schema.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print("Saved ytdlp_schema.json successfully")
