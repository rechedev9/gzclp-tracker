import type { ReactNode } from 'react';

export interface DayTab {
  readonly label: string;
  readonly isComplete: boolean;
}

interface DayNavigatorProps {
  readonly days: readonly DayTab[];
  readonly selectedDay: number;
  readonly currentDay: number;
  readonly onSelectDay: (index: number) => void;
}

export function DayNavigator({
  days,
  selectedDay,
  currentDay,
  onSelectDay,
}: DayNavigatorProps): ReactNode {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-none"
      role="tablist"
      aria-label="Días de la semana"
    >
      {days.map((day, i) => {
        const isSelected = i === selectedDay;
        const isCurrent = i === currentDay;

        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectDay(i)}
            className={`shrink-0 px-4 py-2.5 min-h-[44px] text-[12px] font-bold uppercase tracking-wider border-2 cursor-pointer transition-colors ${
              isSelected
                ? 'bg-[var(--fill-progress)] text-white border-[var(--fill-progress)]'
                : isCurrent
                  ? 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--fill-progress)] hover:text-[var(--text-main)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-main)] hover:text-[var(--text-main)]'
            }`}
          >
            <span className="mr-1.5">{day.isComplete ? '\u25CF' : '\u25CB'}</span>
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
