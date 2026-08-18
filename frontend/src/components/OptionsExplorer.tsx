import React, { useState, useMemo } from 'react';
import { Search, RotateCcw, Sliders } from 'lucide-react';
import type { YtCategory, YtOption } from '../types';
import { getCategoryIcon } from '../utils';

interface OptionsExplorerProps {
  categories: YtCategory[];
  options: Record<string, string | number | boolean | string[]>;
  onChangeOption: (id: string, value: string | number | boolean | string[] | undefined) => void;
  onResetAll: () => void;
}

export const OptionsExplorer: React.FC<OptionsExplorerProps> = ({
  categories,
  options,
  onChangeOption,
  onResetAll
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.label || 'General');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered categories and options based on search
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return {
        categories,
        currentCategory: categories.find(c => c.label === activeCategory) || categories[0]
      };
    }

    const filteredCats = categories.map(cat => {
      const matchingOpts = cat.options.filter(opt =>
        opt.long.toLowerCase().includes(query) ||
        (opt.short && opt.short.toLowerCase().includes(query)) ||
        opt.description.toLowerCase().includes(query) ||
        (opt.title && opt.title.toLowerCase().includes(query))
      );
      return {
        ...cat,
        count: matchingOpts.length,
        options: matchingOpts
      };
    }).filter(cat => cat.options.length > 0);

    return {
      categories: filteredCats,
      currentCategory: filteredCats.find(c => c.label === activeCategory) || filteredCats[0]
    };
  }, [categories, activeCategory, searchQuery]);

  const currentCategory = filteredData.currentCategory;

  // Active options count
  const activeCount = Object.keys(options).filter(k => options[k] !== undefined && options[k] !== false && options[k] !== '').length;

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            yt-dlp Complete Feature Matrix (240+ Options)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Every native yt-dlp parameter is exposed and mapped to its exact CLI flag.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onResetAll}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ({activeCount} active)
            </button>
          )}

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flags (e.g. --proxy, subs)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Split Grid: Left Sidebar Categories, Right Options Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Categories Sidebar */}
        <div className="md:col-span-4 lg:col-span-3 space-y-1 max-h-[560px] overflow-y-auto pr-1">
          {filteredData.categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            const isSelected = currentCategory?.label === cat.label;
            const activeInCat = cat.options.filter(o => options[o.id] !== undefined && options[o.id] !== false && options[o.id] !== '').length;

            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveCategory(cat.label)}
                className={`w-full p-2.5 rounded-xl text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                    : 'bg-slate-900/50 hover:bg-slate-800/80 text-slate-300 border border-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-indigo-400'}`} />
                  <span className="truncate">{cat.label}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {activeInCat > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                      {activeInCat}
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400'}`}>
                    {cat.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Options List */}
        <div className="md:col-span-8 lg:col-span-9 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-5 max-h-[560px] overflow-y-auto space-y-4">
          {currentCategory ? (
            <>
              <div className="border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  {currentCategory.label}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentCategory.description}
                </p>
              </div>

              <div className="space-y-3">
                {currentCategory.options.map((opt: YtOption) => {
                  const currentValue = options[opt.id];
                  const isActive = currentValue !== undefined && currentValue !== false && currentValue !== '';

                  return (
                    <div
                      key={opt.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-indigo-950/30 border-indigo-500/40 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-indigo-300">
                              {opt.long}
                            </span>
                            {opt.short && (
                              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {opt.short}
                              </span>
                            )}
                            {opt.argName && (
                              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-500/20">
                                {opt.argName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {opt.description}
                          </p>
                        </div>

                        {/* Input Controls based on option specification */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {!opt.hasArg ? (
                            /* Switch / Boolean toggle */
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(currentValue)}
                                onChange={(e) => onChangeOption(opt.id, e.target.checked ? true : undefined)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          ) : opt.options && opt.options.length > 0 ? (
                            /* Select Dropdown */
                            <select
                              value={String(currentValue || '')}
                              onChange={(e) => onChangeOption(opt.id, e.target.value || undefined)}
                              className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">(Default / None)</option>
                              {opt.options.map(o => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          ) : (
                            /* Text / Number / Path Input */
                            <input
                              type="text"
                              value={String(currentValue || '')}
                              placeholder={opt.placeholder || opt.argName || 'Value...'}
                              onChange={(e) => onChangeOption(opt.id, e.target.value || undefined)}
                              className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-48"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              No matching options found. Try clearing your search query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
