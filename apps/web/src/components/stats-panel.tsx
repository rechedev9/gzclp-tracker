import { memo, useMemo } from 'react';
import { NAMES, T1_EXERCISES } from '@gzclp/shared/program';
import { extractChartData, calculateStats } from '@gzclp/shared/stats';
import { LineChart } from './line-chart';
import type { StartWeights, Results } from '@gzclp/shared/types';

interface StatsPanelProps {
  startWeights: StartWeights;
  results: Results;
}

const StatsPanel = memo(function StatsPanel({ startWeights, results }: StatsPanelProps) {
  const chartData = useMemo(() => extractChartData(startWeights, results), [startWeights, results]);
  const hasAnyResults = T1_EXERCISES.some((ex) => chartData[ex].some((d) => d.result !== null));

  if (!hasAnyResults) {
    return (
      <div className="text-center py-16">
        <div>
          <p className="font-display text-6xl text-[var(--text-muted)] leading-none mb-3">
            SIN DATOS
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Completa tu primer entrenamiento para ver estadísticas y gráficas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
        {T1_EXERCISES.map((ex) => {
          const s = calculateStats(chartData[ex]);
          return (
            <div key={ex} className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-2">
                {NAMES[ex]}
              </h4>
              <div className="font-display-data text-4xl mb-1">{s.currentWeight} kg</div>
              <div className="text-xs text-[var(--text-muted)]">
                Inicio: {s.startWeight} kg | {s.gained >= 0 ? '+' : ''}
                {s.gained} kg ganados
                <br />
                Etapa {s.currentStage} | {s.rate}% éxito ({s.successes}/{s.total})
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        {T1_EXERCISES.map((ex) => (
          <div key={ex} className="bg-[var(--bg-th)] border border-[var(--border-color)] p-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3">
              {NAMES[ex]} — Progresión de Peso
            </h4>
            <LineChart data={chartData[ex]} label={NAMES[ex]} />
          </div>
        ))}
      </div>
    </div>
  );
});

export { StatsPanel };
export default StatsPanel;
