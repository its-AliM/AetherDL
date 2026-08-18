import {
  Settings, Globe, ShieldCheck, ListFilter, DownloadCloud,
  FolderSync, Image, Link, Terminal, Wrench, Sliders,
  Subtitles, KeyRound, Cpu, Scissors, Plug, Folder,
  type LucideIcon
} from 'lucide-react';

export const getCategoryIcon = (iconName: string): LucideIcon => {
  switch (iconName) {
    case 'Settings': return Settings;
    case 'Globe': return Globe;
    case 'ShieldCheck': return ShieldCheck;
    case 'ListFilter': return ListFilter;
    case 'DownloadCloud': return DownloadCloud;
    case 'FolderSync': return FolderSync;
    case 'Image': return Image;
    case 'Link': return Link;
    case 'Terminal': return Terminal;
    case 'Wrench': return Wrench;
    case 'Sliders': return Sliders;
    case 'Subtitles': return Subtitles;
    case 'KeyRound': return KeyRound;
    case 'Cpu': return Cpu;
    case 'Scissors': return Scissors;
    case 'Plug': return Plug;
    default: return Folder;
  }
};

export const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes === 0) return 'Unknown size';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatDuration = (seconds?: number): string => {
  if (!seconds) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};
