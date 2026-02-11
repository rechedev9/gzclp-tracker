'use client';

import { useRef } from 'react';

interface ToolbarProps {
  completedCount: number;
  totalWorkouts: number;
  undoCount: number;
  onUndo: () => void;
  onExport: () => void;
  onImport: (json: string) => boolean;
  onJumpToCurrent: () => void;
  onReset: () => void;
}

export function Toolbar({
  completedCount,
  totalWorkouts,
  undoCount,
  onUndo,
  onExport,
  onImport,
  onJumpToCurrent,
  onReset,
}: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pct = Math.round((completedCount / totalWorkouts) * 100);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== 'string') return;
      if (!confirm('This will replace all current data with the imported backup. Continue?'))
        return;
      const success = onImport(text);
      alert(success ? 'Data imported successfully!' : 'Failed to import: invalid file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    if (!confirm('Are you sure you want to reset ALL progress? This cannot be undone.')) return;
    onReset();
  };

  const btnClass =
    'px-3.5 py-2.5 min-h-[44px] border-2 border-[var(--btn-border)] text-xs font-bold cursor-pointer bg-[var(--btn-bg)] text-[var(--btn-text)] whitespace-nowrap transition-all hover:bg-[var(--btn-hover-bg)] hover:text-[var(--btn-hover-text)] disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-[var(--btn-bg)] disabled:hover:text-[var(--btn-text)]';

  return (
    <div className="sticky top-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-5 py-3 shadow-[0_2px_8px_var(--shadow-toolbar)]">
      {/* Progress bar - always full width */}
      <div className="flex items-center gap-3 mb-2 sm:mb-0 sm:hidden">
        <div className="flex-1 h-2 bg-[var(--bg-progress)] overflow-hidden">
          <div
            className="h-full bg-[var(--fill-progress)] transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-bold text-[var(--text-muted)] whitespace-nowrap">
          {completedCount}/{totalWorkouts} ({pct}%)
        </span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Left */}
        <div className="flex items-center gap-3 shrink-0">
          <button className={btnClass} onClick={onUndo} disabled={undoCount === 0}>
            Undo
          </button>
          {undoCount > 0 && (
            <span className="text-[11px] text-[var(--text-muted)]">{undoCount} undo</span>
          )}
        </div>

        {/* Progress - desktop */}
        <div className="flex-1 hidden sm:flex items-center gap-3">
          <div className="flex-1 h-2 bg-[var(--bg-progress)] overflow-hidden">
            <div
              className="h-full bg-[var(--fill-progress)] transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[var(--text-muted)] whitespace-nowrap">
            {completedCount} / {totalWorkouts} ({pct}%)
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button className={btnClass} onClick={onExport}>
            Export
          </button>
          <button className={btnClass} onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <button className={btnClass} onClick={onJumpToCurrent}>
            Go to current
          </button>
          <button className={btnClass} onClick={handleReset}>
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
}
