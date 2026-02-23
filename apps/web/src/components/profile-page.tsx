import { useMemo } from 'react';
import { useProgram } from '@/hooks/use-program';
import { useAuth } from '@/contexts/auth-context';
import { computeProfileData } from '@/lib/profile-stats';
import { extractChartData, calculateStats } from '@gzclp/shared/stats';
import { NAMES, T1_EXERCISES } from '@gzclp/shared/program';
import { ProfileStatCard } from './profile-stat-card';
import { LineChart } from './line-chart';
import { AppHeader } from './app-header';

interface ProfilePageProps {
  readonly onBack: () => void;
}

export function ProfilePage({ onBack }: ProfilePageProps): React.ReactNode {
  const { startWeights, results } = useProgram();
  const { user } = useAuth();

  const profileData = useMemo(() => {
    if (!startWeights) return null;
    return computeProfileData(startWeights, results);
  }, [startWeights, results]);

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
        <section className="mb-10">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-header)] leading-tight">
            Training Profile
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{displayName}</p>
        </section>

        {/* Empty state */}
        {!profileData && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 sm:p-12 text-center">
            <p className="text-lg font-bold text-[var(--text-header)] mb-2">No program yet</p>
            <p className="text-sm text-[var(--text-muted)]">
              Start a program from the Dashboard to see your training profile.
            </p>
            <button
              onClick={onBack}
              className="mt-5 px-5 py-2.5 text-xs font-bold border-2 border-[var(--btn-border)] bg-[var(--btn-hover-bg)] text-[var(--btn-hover-text)] cursor-pointer transition-all hover:opacity-90"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {profileData && (
          <>
            {/* Summary stats */}
            <section className="mb-10">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3">
                Overview
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <ProfileStatCard
                  value={String(profileData.completion.workoutsCompleted)}
                  label="Workouts"
                  sublabel={`of ${profileData.completion.totalWorkouts}`}
                />
                <ProfileStatCard
                  value={`${profileData.completion.overallSuccessRate}%`}
                  label="Success Rate"
                />
                <ProfileStatCard
                  value={`${profileData.completion.completionPct}%`}
                  label="Completion"
                  progress={{
                    value: profileData.completion.completionPct,
                    label: `${profileData.completion.workoutsCompleted} of ${profileData.completion.totalWorkouts} workouts`,
                  }}
                />
              </div>
            </section>

            {/* Personal Records */}
            <section className="mb-10">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3">
                Personal Records (T1)
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
                        pr.workoutIndex >= 0 ? `Workout #${pr.workoutIndex + 1}` : 'Starting weight'
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
                  Weight Progression
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
                            | {stats.rate}% success
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
