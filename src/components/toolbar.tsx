'use client';

import { useState, useCallback } from 'react';
import { Button } from './button';
import { ConfirmDialog } from './confirm-dialog';
import { DropdownMenu, DropdownItem } from './dropdown-menu';

interface ToolbarProps {
  readonly completedCount: number;
  readonly totalWorkouts: number;
  readonly undoCount: number;
  readonly onUndo: () => void;
  readonly onJumpToCurrent: () => void;
  readonly onReset: () => void;
}

export function Toolbar({
  completedCount,
  totalWorkouts,
  undoCount,
  onUndo,
  onJumpToCurrent,
  onReset,
}: ToolbarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback((): void => setMenuOpen(false), []);
  const pct = Math.round((completedCount / totalWorkouts) * 100);

  return (
    <div className="bg-[var(--bg-card)] border-b border-[var(--border-color)] px-3 sm:px-5 py-2 sm:py-3 shadow-[0_2px_8px_var(--shadow-toolbar)]">
      {/* Progress bar - always full width */}
      <div className="flex items-center gap-3 mb-2 sm:mb-0 sm:hidden">
        <div
          className="flex-1 h-2 bg-[var(--bg-progress)] overflow-hidden"
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalWorkouts}
          aria-label="Workout completion progress"
        >
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
          <Button size="sm" onClick={onUndo} disabled={undoCount === 0}>
            Undo
          </Button>
          {undoCount > 0 && (
            <span className="text-[11px] text-[var(--text-muted)]">{undoCount} undo</span>
          )}
        </div>

        {/* Progress - desktop */}
        <div className="flex-1 hidden sm:flex items-center gap-3">
          <div
            className="flex-1 h-2 bg-[var(--bg-progress)] overflow-hidden"
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={totalWorkouts}
            aria-label="Workout completion progress"
          >
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
        <div className="flex items-center gap-2.5 shrink-0">
          <Button size="sm" onClick={onJumpToCurrent}>
            Go to current
          </Button>

          {/* Overflow menu */}
          <div className="relative">
            <Button
              size="sm"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="More actions"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              &#8942;
            </Button>
            <DropdownMenu open={menuOpen} onClose={closeMenu} align="right">
              <DropdownItem
                variant="danger"
                onClick={() => {
                  closeMenu();
                  setConfirmOpen(true);
                }}
              >
                Reset All
              </DropdownItem>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Reset All Progress"
        message="Are you sure you want to reset ALL progress? This cannot be undone."
        confirmLabel="Reset All"
        variant="danger"
        onConfirm={() => {
          onReset();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
