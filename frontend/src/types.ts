export interface YtOption {
  id: string;
  short: string | null;
  long: string;
  category: string;
  argName: string | null;
  hasArg: boolean;
  optionalArg: boolean;
  type: 'boolean' | 'string' | 'number' | 'path' | 'template' | 'select' | 'multiselect' | 'switch' | 'format_selector';
  description: string;
  title?: string;
  widget?: string;
  placeholder?: string;
  options?: string[];
  quickOptions?: { label: string; value: string }[];
  defaultValue?: string | number | boolean | string[] | null;
}

export interface YtCategory {
  name: string;
  label: string;
  description: string;
  count: number;
  icon: string;
  options: YtOption[];
}

export interface YtSchema {
  version: string;
  totalOptions: number;
  categories: YtCategory[];
}

export interface MediaFormat {
  format_id: string;
  ext: string;
  resolution: string;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  tbr?: number;
  vbr?: number;
  abr?: number;
  format_note?: string;
  dynamic_range?: string;
  container?: string;
  protocol?: string;
  is_video: boolean;
  is_audio: boolean;
}

export interface MediaMetadata {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  duration_string?: string;
  uploader?: string;
  uploader_url?: string;
  view_count?: number;
  like_count?: number;
  upload_date?: string;
  tags?: string[];
  webpage_url?: string;
  extractor?: string;
  formats: MediaFormat[];
  subtitles: string[];
  autoSubtitles: string[];
  chapters?: { title: string; start_time: number; end_time: number }[];
}

export interface DownloadJob {
  id: string;
  url: string;
  title: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  eta: string;
  speed: string;
  size: string;
  filename: string;
  downloadPath: string;
  startTime: number;
  endTime: number | null;
  error: string | null;
  command: string;
  logs: { time: string; text: string; type: 'stdout' | 'stderr' }[];
}

export interface SystemStatus {
  ytdlp: { installed: boolean; version: string };
  ffmpeg: { installed: boolean; version: string };
  downloadsDir: string;
  activeJobsCount: number;
}

export interface DownloadedFile {
  name: string;
  size: number;
  mtime: string;
  isFile: boolean;
  url: string;
}
