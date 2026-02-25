import { useMemo } from 'react';
import { extractChartData, calculateStats } from '@gzclp/shared/stats';
import type { ProgramDefinition } from '@gzclp/shared/types/program';
import { LineChart } from './line-chart';
import type { StartWeights, Results } from '@gzclp/shared/types';

interface StatsPanelProps {
  readonly startWeights: StartWeights;
  readonly results: Results;
  readonly definition?: ProgramDefinition;
}

function StatsPanel({ startWeights, results, definition }: StatsPanelProps): React.ReactNode {
  // Derive NAMES and T1_EXERCISES from definition
  const { names, t1Exercises } = useMemo(() => {
    if (!definition) {
      const empty: { names: Record<string, string>; t1Exercises: string[] } = {
        names: {},
        t1Exercises: [],
      };
      return empty;
    }
    const nm: Record<string, string> = {};
    for (const [id, ex] of Object.entries(definition.exercises)) {
      nm[id] = ex.name;
    }
    const t1Set = new Set<string>();
    for (const day of definition.days) {
      for (const slot of day.slots) {
        if (slot.tier === 't1') t1Set.add(slot.exerciseId);
      }
    }
    return { names: nm, t1Exercises: [...t1Set] };
  }, [definition]);

  const chartData = extractChartData(startWeights, results);
  const hasAnyResults = t1Exercises.some((ex) => chartData[ex]?.some((d) => d.result !== null));

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
        {t1Exercises.map((ex) => {
          const data = chartData[ex];
          if (!data) return null;
          const s = calculateStats(data);
          return (
            <div
              key={ex}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 card edge-glow-top"
            >
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-2">
                {names[ex] ?? ex}
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
        {t1Exercises.map((ex) => {
          const data = chartData[ex];
          if (!data) return null;
          return (
            <div
              key={ex}
              className="bg-[var(--bg-th)] border border-[var(--border-color)] p-4 card"
            >
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                {names[ex] ?? ex} — Progresión de Peso
              </h4>
              <LineChart data={data} label={names[ex] ?? ex} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { StatsPanel };
export default StatsPanel;
