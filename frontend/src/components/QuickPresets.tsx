import React from 'react';
import { Play, Sparkles, Music, Film, Tv, Shield, Zap, Layers } from 'lucide-react';

interface PresetItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge: string;
  options: Record<string, string | number | boolean | string[]>;
}

interface QuickPresetsProps {
  onApplyPreset: (name: string, options: Record<string, string | number | boolean | string[]>) => void;
  onQuickDownload: (presetName: string, options: Record<string, string | number | boolean | string[]>) => void;
}

export const QuickPresets: React.FC<QuickPresetsProps> = ({
  onApplyPreset,
  onQuickDownload
}) => {
  const presets: PresetItem[] = [
    {
      id: 'best_video',
      title: 'Maximum Quality (Video + Audio)',
      description: 'Highest available video + audio merged into MP4/MKV with embedded metadata & chapters',
      icon: Film,
      color: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30 hover:border-indigo-500',
      badge: 'Best Quality',
      options: {
        'format': 'bestvideo+bestaudio/best',
        'merge-output-format': 'mp4',
        'embed-metadata': true,
        'embed-chapters': true,
        'embed-thumbnail': true
      }
    },
    {
      id: 'mp3_320',
      title: 'Extract MP3 (320 kbps)',
      description: 'Convert audio to highest quality MP3 with embedded album art & ID3 metadata',
      icon: Music,
      color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30 hover:border-pink-500',
      badge: 'Music / Podcast',
      options: {
        'extract-audio': true,
        'audio-format': 'mp3',
        'audio-quality': '0',
        'embed-thumbnail': true,
        'embed-metadata': true
      }
    },
    {
      id: 'lossless_audio',
      title: 'Lossless Audio (FLAC/Opus)',
      description: 'Extract pristine original/FLAC audio for audiophiles & sound archives',
      icon: Zap,
      color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30 hover:border-amber-500',
      badge: 'Lossless',
      options: {
        'extract-audio': true,
        'audio-format': 'flac',
        'embed-metadata': true,
        'embed-thumbnail': true
      }
    },
    {
      id: 'fast_1080p',
      title: 'Fast 1080p MP4 (Compatibility)',
      description: 'Standard 1080p H.264 / AAC for instant playback on TVs, phones & editing software',
      icon: Tv,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 hover:border-emerald-500',
      badge: 'Universal MP4',
      options: {
        'format': 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4] / bv*[height<=1080]+ba/b[height<=1080]',
        'merge-output-format': 'mp4',
        'embed-metadata': true
      }
    },
    {
      id: 'sponsorblock_clean',
      title: 'Ad-Free (SponsorBlock Cut)',
      description: 'Automatically cut out sponsors, intros, outros, and self-promotions using SponsorBlock API',
      icon: Shield,
      color: 'from-purple-500/20 to-violet-500/20 border-purple-500/30 hover:border-purple-500',
      badge: 'SponsorBlock',
      options: {
        'sponsorblock-remove': 'all',
        'embed-chapters': true,
        'embed-metadata': true
      }
    },
    {
      id: 'multi_subtitles',
      title: 'Video + All Subtitles',
      description: 'Download video and automatically embed all available English & international subtitles',
      icon: Layers,
      color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 hover:border-cyan-500',
      badge: 'Subtitles',
      options: {
        'write-subs': true,
        'write-auto-subs': true,
        'sub-langs': 'all',
        'embed-subs': true
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Quick Presets & 1-Click Profiles
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a tuned preset or inspect stream tracks below for full granular control.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {presets.map((preset) => {
          const Icon = preset.icon;
          return (
            <div
              key={preset.id}
              className={`p-4 rounded-xl border bg-gradient-to-br ${preset.color} backdrop-blur-sm transition-all duration-200 flex flex-col justify-between hover:shadow-lg group`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-white/10 text-white group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                    {preset.badge}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  {preset.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => onApplyPreset(preset.title, preset.options)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 hover:border-slate-600 transition-all text-center cursor-pointer"
                >
                  Configure
                </button>
                <button
                  type="button"
                  onClick={() => onQuickDownload(preset.title, preset.options)}
                  className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Download
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
