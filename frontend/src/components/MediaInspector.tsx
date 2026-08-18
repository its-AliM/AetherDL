import React, { useState } from 'react';
import { Search, Loader2, Sparkles, Clock, Eye, ThumbsUp, User, Tag, Music, Film, CheckCircle2 } from 'lucide-react';
import type { MediaMetadata, MediaFormat } from '../types';
import { formatBytes } from '../utils';

interface MediaInspectorProps {
  url: string;
  onUrlChange: (url: string) => void;
  metadata: MediaMetadata | null;
  loading: boolean;
  onInspect: () => void;
  selectedFormat: string;
  onSelectFormat: (formatId: string) => void;
}

export const MediaInspector: React.FC<MediaInspectorProps> = ({
  url,
  onUrlChange,
  metadata,
  loading,
  onInspect,
  selectedFormat,
  onSelectFormat
}) => {
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio'>('all');

  const filteredFormats = (metadata?.formats || []).filter(f => {
    if (filterType === 'video') return f.is_video;
    if (filterType === 'audio') return f.is_audio && !f.is_video;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* URL Input Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onInspect()}
            placeholder="Paste media or playlist URL (YouTube, Twitch, Twitter/X, TikTok, Bilibili, SoundCloud, 1000+ sites...)"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm transition-all shadow-inner"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={onInspect}
          disabled={loading || !url.trim()}
          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Analyze Media</span>
            </>
          )}
        </button>
      </div>

      {/* Metadata Preview Card */}
      {metadata && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl transition-all">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Thumbnail & Badges */}
            {metadata.thumbnail && (
              <div className="relative w-full lg:w-72 aspect-video rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-800 shadow-md">
                <img
                  src={metadata.thumbnail}
                  alt={metadata.title}
                  className="w-full h-full object-cover"
                />
                {metadata.duration_string && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-xs font-semibold backdrop-blur-sm">
                    {metadata.duration_string}
                  </span>
                )}
                {metadata.extractor && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold backdrop-blur-sm capitalize">
                    {metadata.extractor}
                  </span>
                )}
              </div>
            )}

            {/* Video Details */}
            <div className="flex-1 min-w-0 space-y-3">
              <h3 className="text-lg font-bold text-white leading-snug line-clamp-2">
                {metadata.title}
              </h3>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                {metadata.uploader && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{metadata.uploader}</span>
                  </div>
                )}
                {metadata.view_count !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>{metadata.view_count.toLocaleString()} views</span>
                  </div>
                )}
                {metadata.like_count !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5 text-slate-500" />
                    <span>{metadata.like_count.toLocaleString()} likes</span>
                  </div>
                )}
                {metadata.upload_date && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{metadata.upload_date}</span>
                  </div>
                )}
              </div>

              {metadata.tags && metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {metadata.tags.slice(0, 5).map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/50"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {t}
                    </span>
                  ))}
                  {metadata.tags.length > 5 && (
                    <span className="text-[11px] text-slate-500 self-center">
                      +{metadata.tags.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Subtitles & Chapters summary */}
              <div className="flex flex-wrap gap-3 pt-2 text-xs">
                {metadata.subtitles?.length > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    💬 {metadata.subtitles.length} Subtitles ({metadata.subtitles.slice(0, 4).join(', ')})
                  </span>
                )}
                {metadata.chapters && metadata.chapters.length > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    🔖 {metadata.chapters.length} Chapters detected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Formats Table */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Available Streams & Formats ({metadata.formats.length})
                </h4>
              </div>

              {/* Format Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({metadata.formats.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('video')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                    filterType === 'video' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Film className="w-3 h-3" />
                  Video ({metadata.formats.filter(f => f.is_video).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('audio')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                    filterType === 'audio' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Music className="w-3 h-3" />
                  Audio Only ({metadata.formats.filter(f => f.is_audio && !f.is_video).length})
                </button>
              </div>
            </div>

            {/* Formats Grid / List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {filteredFormats.map((f: MediaFormat) => {
                const isSelected = selectedFormat === f.format_id;
                return (
                  <div
                    key={f.format_id}
                    onClick={() => onSelectFormat(f.format_id)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 flex justify-center">
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-700" />
                        )}
                      </div>
                      <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {f.format_id}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {f.resolution} {f.fps ? `@ ${f.fps}fps` : ''}
                      </span>
                      <span className="uppercase text-[11px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
                        {f.ext}
                      </span>
                      {f.vcodec && f.vcodec !== 'none' && (
                        <span className="text-slate-400 hidden sm:inline">
                          Video: <span className="text-slate-300">{f.vcodec.split('.')[0]}</span>
                        </span>
                      )}
                      {f.acodec && f.acodec !== 'none' && (
                        <span className="text-slate-400 hidden sm:inline">
                          Audio: <span className="text-slate-300">{f.acodec.split('.')[0]}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      {f.tbr && (
                        <span className="text-slate-400 text-[11px]">
                          {Math.round(f.tbr)} kbps
                        </span>
                      )}
                      <span className="font-mono text-slate-300 font-medium">
                        {formatBytes(f.filesize)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
