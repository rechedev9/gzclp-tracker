import { useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgram } from '@/hooks/use-program';
import { useAuth } from '@/contexts/auth-context';
import { computeProfileData, formatVolume } from '@/lib/profile-stats';
import { extractChartData, calculateStats } from '@gzclp/shared/stats';
import { NAMES, T1_EXERCISES } from '@gzclp/shared/program';
import { updateProfile } from '@/lib/api-functions';
import { resizeImageToDataUrl } from '@/lib/resize-image';
import { Button } from './button';
import { ProfileStatCard } from './profile-stat-card';
import { LineChart } from './line-chart';
import { AppHeader } from './app-header';
import { DeleteAccountDialog } from './delete-account-dialog';

interface ProfilePageProps {
  readonly onBack: () => void;
}

export function ProfilePage({ onBack }: ProfilePageProps): React.ReactNode {
  const { startWeights, results, resultTimestamps } = useProgram();
  const { user, updateUser, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const profileData = useMemo(() => {
    if (!startWeights) return null;
    return computeProfileData(startWeights, results, resultTimestamps);
  }, [startWeights, results, resultTimestamps]);

  const chartData = useMemo(() => {
    if (!startWeights) return null;
    return extractChartData(startWeights, results);
  }, [startWeights, results]);

  const handleAvatarClick = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so the same file can be re-selected
      e.target.value = '';

      setAvatarUploading(true);
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        await updateProfile({ avatarUrl: dataUrl });
        updateUser({ avatarUrl: dataUrl });
      } catch (err: unknown) {
        console.error('[profile] Avatar upload failed:', err instanceof Error ? err.message : err);
      } finally {
        setAvatarUploading(false);
      }
    },
    [updateUser]
  );

  const handleRemoveAvatar = useCallback(async (): Promise<void> => {
    setAvatarUploading(true);
    try {
      await updateProfile({ avatarUrl: null });
      updateUser({ avatarUrl: undefined });
    } catch (err: unknown) {
      console.error('[profile] Avatar removal failed:', err instanceof Error ? err.message : err);
    } finally {
      setAvatarUploading(false);
    }
  }, [updateUser]);

  const handleDeleteAccount = useCallback(async (): Promise<void> => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
      navigate('/');
    } catch (err: unknown) {
      console.error('[profile] Account deletion failed:', err instanceof Error ? err.message : err);
      setDeleteLoading(false);
    }
  }, [deleteAccount, navigate]);

  const displayName = user?.name ?? user?.email ?? 'Local Lifter';
  const initial = (user?.email?.[0] ?? 'U').toUpperCase();

  return (
    <div className="min-h-dvh bg-[var(--bg-body)]">
      <AppHeader backLabel="Dashboard" onBack={onBack} />

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* Page title */}
        <section className="mb-12">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-header)] leading-tight">
            Perfil
          </h1>
        </section>

        {/* Account settings (authenticated users only) */}
        {user && (
          <section className="mb-12">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
              Cuenta
            </h2>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 sm:p-6">
              <div className="flex items-center gap-4 sm:gap-5">
                {/* Avatar */}
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={avatarUploading}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--btn-hover-bg)] text-[var(--btn-hover-text)] text-xl sm:text-2xl font-extrabold cursor-pointer transition-opacity hover:opacity-80 flex items-center justify-center overflow-hidden shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--fill-progress)] focus-visible:outline-none disabled:opacity-50"
                  aria-label="Cambiar avatar"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initial
                  )}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center transition-colors">
                    <span className="text-white text-[10px] font-bold uppercase opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                      Cambiar
                    </span>
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void handleFileChange(e)}
                />

                {/* User info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--text-header)] truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                  {user.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveAvatar()}
                      disabled={avatarUploading}
                      className="text-[10px] text-[var(--text-muted)] underline mt-1 cursor-pointer hover:text-[var(--text-main)] transition-colors disabled:opacity-50"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div className="mt-6 bg-[var(--bg-card)] border border-[var(--border-badge-no)] p-5 sm:p-6">
              <h3 className="text-xs font-bold text-[var(--text-badge-no)] uppercase tracking-[0.15em] mb-2">
                Zona de Peligro
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                Eliminar tu cuenta marcará todos tus datos para borrado permanente tras 30 días.
                Esta acción no se puede deshacer.
              </p>
              <Button variant="danger" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                Eliminar Cuenta
              </Button>
            </div>
          </section>
        )}

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
            {/* Training stats header */}
            <section className="mb-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Estadísticas de Entrenamiento
              </h2>
            </section>

            {/* Summary stats */}
            <section className="mb-12">
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

      {/* Delete account confirmation dialog */}
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onConfirm={() => void handleDeleteAccount()}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleteLoading}
      />
    </div>
  );
}
