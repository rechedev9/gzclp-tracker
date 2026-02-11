'use client';

import { NAMES } from '@/lib/program';
import { extractChartData, calculateStats, T1_EXERCISES } from '@/lib/stats';
import { LineChart } from './line-chart';
import type { StartWeights, Results } from '@/types';

interface StatsPanelProps {
  startWeights: StartWeights;
  results: Results;
}

export function StatsPanel({ startWeights, results }: StatsPanelProps) {
  const chartData = extractChartData(startWeights, results);

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
        {T1_EXERCISES.map((ex) => {
          const s = calculateStats(chartData[ex]);
          return (
            <div key={ex} className="bg-[var(--bg-th)] border border-[var(--border-color)] p-4">
              <h4 className="text-[13px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                {NAMES[ex]}
              </h4>
              <div className="text-2xl font-extrabold mb-1">{s.currentWeight} kg</div>
              <div className="text-xs text-[var(--text-muted)]">
                Started: {s.startWeight} kg | {s.gained >= 0 ? '+' : ''}
                {s.gained} kg gained
                <br />
                Stage {s.currentStage} | {s.rate}% success ({s.successes}/{s.total})
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        {T1_EXERCISES.map((ex) => (
          <div key={ex} className="bg-[var(--bg-th)] border border-[var(--border-color)] p-4">
            <h4 className="text-sm font-bold mb-3">{NAMES[ex]} — Weight Progression</h4>
            <LineChart data={chartData[ex]} label={NAMES[ex]} />
          </div>
        ))}
      </div>
    </div>
  );
}
