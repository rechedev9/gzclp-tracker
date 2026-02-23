import { useMemo } from 'react';
import { useProgram } from '@/hooks/use-program';
import { useAuth } from '@/contexts/auth-context';
import { computeProfileData, formatVolume } from '@/lib/profile-stats';
import { extractChartData, calculateStats } from '@gzclp/shared/stats';
import { NAMES, T1_EXERCISES } from '@gzclp/shared/program';
import { Button } from './button';
import { ProfileStatCard } from './profile-stat-card';
import { LineChart } from './line-chart';
import { AppHeader } from './app-header';

interface ProfilePageProps {
  readonly onBack: () => void;
}

export function ProfilePage({ onBack }: ProfilePageProps): React.ReactNode {
  const { startWeights, results, resultTimestamps } = useProgram();
  const { user } = useAuth();

  const profileData = useMemo(() => {
    if (!startWeights) return null;
    return computeProfileData(startWeights, results, resultTimestamps);
  }, [startWeights, results, resultTimestamps]);

  const chartData = useMemo(() => {
    if (!startWeights) return null;
    return extractChartData(startWeights, results);
  }, [startWeights, results]);

  const displayName = user?.email ?? 'Local Lifter';

  return (
    <div className="min-h-dvh bg-[var(--bg-body)]">
      <AppHeader backLabel="Dashboard" onBack={onBack} />

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* User identity */}
        <section className="mb-12">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-header)] leading-tight">
            Perfil de Entrenamiento
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{displayName}</p>
        </section>

        {/* Empty state */}
        {!profileData && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 sm:p-12 text-center">
            <p className="font-display text-6xl sm:text-7xl text-[var(--text-muted)] leading-none mb-4">
              SIN PROGRAMA
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Inicia un programa desde el Dashboard para ver tu perfil de entrenamiento.
            </p>
            <div className="mt-5 flex justify-center">
              <Button variant="primary" onClick={onBack}>
                Ir al Dashboard
              </Button>
            </div>
          </div>
        )}

        {profileData && (
          <>
            {/* Summary stats */}
            <section className="mb-12">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
                Resumen
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <ProfileStatCard
                  value={String(profileData.completion.workoutsCompleted)}
                  label="Entrenamientos"
                  sublabel={`de ${profileData.completion.totalWorkouts}`}
                />
                <ProfileStatCard
                  value={`${profileData.completion.overallSuccessRate}%`}
                  label="Tasa de Éxito"
                />
                <ProfileStatCard
                  value={`${profileData.completion.completionPct}%`}
                  label="Completado"
                  progress={{
                    value: profileData.completion.completionPct,
                    label: `${profileData.completion.workoutsCompleted} de ${profileData.completion.totalWorkouts} entrenamientos`,
                  }}
                />
              </div>
            </section>

            {/* Streak */}
            {(profileData.streak.current > 0 || profileData.streak.longest > 0) && (
              <section className="mb-10">
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3">
                  Racha
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <ProfileStatCard
                    value={String(profileData.streak.current)}
                    label="Racha Actual"
                    sublabel="entrenamientos consecutivos"
                  />
                  <ProfileStatCard
                    value={String(profileData.streak.longest)}
                    label="Racha Más Larga"
                    sublabel="entrenamientos consecutivos"
                  />
                </div>
              </section>
            )}

            {/* Monthly Summary */}
            {profileData.monthlyReport && (
              <section className="mb-10">
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3">
                  {profileData.monthlyReport.monthLabel}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ProfileStatCard
                    value={String(profileData.monthlyReport.workoutsCompleted)}
                    label="Entrenamientos"
                    sublabel="este mes"
                  />
                  <ProfileStatCard
                    value={`${profileData.monthlyReport.successRate}%`}
                    label="Tasa de Éxito"
                  />
                  <ProfileStatCard
                    value={String(profileData.monthlyReport.personalRecords)}
                    label="Nuevos PRs"
                    accent={profileData.monthlyReport.personalRecords > 0}
                  />
                  <ProfileStatCard
                    value={`${formatVolume(profileData.monthlyReport.totalVolume)} kg`}
                    label="Volumen"
                    sublabel={`${profileData.monthlyReport.totalSets} series / ${profileData.monthlyReport.totalReps} reps`}
                  />
                </div>
              </section>
            )}

            {/* Personal Records */}
            <section className="mb-12">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
                Récords Personales (T1)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {profileData.personalRecords.map((pr) => {
                  const delta = pr.weight - pr.startWeight;
                  return (
                    <ProfileStatCard
                      key={pr.exercise}
                      value={`${pr.weight} kg`}
                      label={NAMES[pr.exercise] ?? pr.exercise}
                      sublabel={
                        pr.workoutIndex >= 0
                          ? `Entrenamiento #${pr.workoutIndex + 1}`
                          : 'Peso inicial'
                      }
                      accent
                      badge={delta > 0 ? `+${delta} kg` : undefined}
                      badgeVariant="success"
                    />
                  );
                })}
              </div>
            </section>

            {/* Weight Progression Charts */}
            {chartData && (
              <section className="mb-10">
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3">
                  Progresión de Peso
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {T1_EXERCISES.map((ex) => {
                    const stats = calculateStats(chartData[ex]);
                    const hasMark = stats.total > 0;
                    return (
                      <div
                        key={ex}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4"
                      >
                        <h3 className="text-sm font-bold text-[var(--text-header)] mb-1">
                          {NAMES[ex]}
                        </h3>
                        {hasMark && (
                          <p className="text-[11px] text-[var(--text-muted)] mb-3">
                            {stats.currentWeight} kg
                            {stats.gained > 0 && (
                              <span className="text-[var(--text-badge-ok)]">
                                {' '}
                                | +{stats.gained} kg
                              </span>
                            )}{' '}
                            | {stats.rate}% éxito
                          </p>
                        )}
                        <LineChart data={chartData[ex]} label={NAMES[ex]} />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
