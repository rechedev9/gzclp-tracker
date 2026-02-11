'use client';

import { useState, useRef, useEffect } from 'react';
import { WorkoutRow } from './workout-row';
import { WorkoutRowCard } from './workout-row-card';
import type { WorkoutRow as WorkoutRowType, Tier, ResultValue } from '@/types';

interface WeekSectionProps {
  week: number;
  rows: WorkoutRowType[];
  firstPendingIdx: number;
  onMark: (index: number, tier: Tier, value: ResultValue) => void;
  onUndo: (index: number, tier: Tier) => void;
}

function LazyContent({
  children,
  forceVisible,
}: {
  children: React.ReactNode;
  forceVisible: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(forceVisible);

  useEffect(() => {
    if (forceVisible || visible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [forceVisible, visible]);

  if (!visible) {
    return <div ref={ref} className="h-[180px]" />;
  }

  return <>{children}</>;
}

export function WeekSection({ week, rows, firstPendingIdx, onMark, onUndo }: WeekSectionProps) {
  const isDeload = week % 4 === 0;
  const weekDone = rows.every((r) => r.result.t1 && r.result.t2 && r.result.t3);
  const [collapsed, setCollapsed] = useState(weekDone);

  const startWo = rows[0].index + 1;
  const endWo = rows[rows.length - 1].index + 1;

  // Force-render current week and neighbors immediately
  const currentWeek = firstPendingIdx >= 0 ? Math.floor(firstPendingIdx / 3) + 1 : 1;
  const forceVisible = Math.abs(week - currentWeek) <= 1;

  return (
    <div className="mb-8 break-inside-avoid">
      <div
        className="bg-[var(--bg-header)] text-[var(--text-header)] px-5 py-3.5 text-[15px] font-bold flex justify-between items-center cursor-pointer select-none hover:opacity-90"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span>
          Week {week}
          {isDeload && (
            <span className="inline-block bg-[var(--text-header)] text-[var(--bg-header)] px-2.5 py-0.5 text-[11px] font-bold ml-2.5">
              Deload if needed
            </span>
          )}
          {weekDone && (
            <span className="inline-block bg-[var(--text-header)] text-[var(--bg-header)] px-2.5 py-0.5 text-[11px] font-bold ml-2.5">
              DONE
            </span>
          )}
        </span>
        <span className="text-xs font-normal opacity-70">
          Workouts {startWo}&ndash;{endWo}
        </span>
      </div>

      {!collapsed && (
        <LazyContent forceVisible={forceVisible}>
          {/* Desktop table */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full border-collapse bg-[var(--bg-card)] border border-[var(--border-color)] min-w-[800px]">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="bg-[var(--bg-th)] border border-[var(--border-color)] px-2 py-2.5 text-center font-bold text-[11px] uppercase tracking-wide text-[var(--text-label)] w-[4%]"
                  >
                    #
                  </th>
                  <th
                    rowSpan={2}
                    className="bg-[var(--bg-th)] border border-[var(--border-color)] px-2 py-2.5 text-center font-bold text-[11px] uppercase tracking-wide text-[var(--text-label)] w-[5%]"
                  >
                    Day
                  </th>
                  <th
                    colSpan={4}
                    className="bg-[var(--bg-th)] border border-[var(--border-color)] px-2 py-2.5 text-center font-bold text-[11px] uppercase tracking-wide text-[var(--text-label)] w-[33%]"
                  >
                    T1 — Main Lift{' '}
                    <span className="font-normal normal-case">(last set = AMRAP)</span>
                  </th>
                  <th
                    colSpan={4}
                    className="bg-[var(--bg-th)] border border-[var(--border-color)] px-2 py-2.5 text-center font-bold text-[11px] uppercase tracking-wide text-[var(--text-label)] w-[33%]"
                  >
                    T2 — Secondary
                  </th>
                  <th
                    colSpan={3}
                    className="bg-[var(--bg-th)] border border-[var(--border-color)] px-2 py-2.5 text-center font-bold text-[11px] uppercase tracking-wide text-[var(--text-label)] w-[25%]"
                  >
                    T3 — Accessory{' '}
                    <span className="font-normal normal-case">(last set = AMRAP)</span>
                  </th>
                </tr>
                <tr>
                  {[
                    'Exercise',
                    'kg',
                    'Scheme',
                    'Result',
                    'Exercise',
                    'kg',
                    'Scheme',
                    'Result',
                    'Exercise',
                    'kg',
                    'Result',
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="bg-[var(--bg-th)] border border-[var(--border-color)] px-2 py-2.5 text-center font-bold text-[11px] uppercase tracking-wide text-[var(--text-label)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <WorkoutRow
                    key={row.index}
                    row={row}
                    isCurrent={row.index === firstPendingIdx}
                    onMark={onMark}
                    onUndo={onUndo}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden">
            {rows.map((row) => (
              <WorkoutRowCard
                key={row.index}
                row={row}
                isCurrent={row.index === firstPendingIdx}
                onMark={onMark}
                onUndo={onUndo}
              />
            ))}
          </div>
        </LazyContent>
      )}
    </div>
  );
}
