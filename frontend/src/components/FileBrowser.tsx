import React from 'react';
import { FolderOpen, HardDrive, FileVideo, Trash2, ExternalLink } from 'lucide-react';
import type { DownloadedFile } from '../types';
import { formatBytes } from '../utils';

interface FileBrowserProps {
  files: DownloadedFile[];
  downloadsDir: string;
  onOpenFolder: () => void;
  onDeleteFile: (filename: string) => void;
  onRefresh: () => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  files,
  downloadsDir,
  onOpenFolder,
  onDeleteFile
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            Downloaded Media & Files ({files.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md font-mono">
            {downloadsDir}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFolder}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Open Downloads Folder
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 text-center space-y-2">
          <HardDrive className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-medium text-slate-400">No media downloaded yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Files saved by yt-dlp will appear here with direct playback, deletion, and directory access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {files.map((file) => (
            <div
              key={file.name}
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
                  <FileVideo className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors" title={file.name}>
                    {file.name}
                  </h5>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span>{new Date(file.mtime).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80">
                <a
                  href={file.url}
                  download={file.name}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Play / Save
                </a>

                <button
                  type="button"
                  onClick={() => onDeleteFile(file.name)}
                  className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete File"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
