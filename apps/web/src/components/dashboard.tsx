import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchPrograms,
  fetchGenericProgramDetail,
  fetchCatalogList,
  fetchCatalogDetail,
} from '@/lib/api-functions';
import { useAuth } from '@/contexts/auth-context';
import { ProgramCard } from './program-card';
import { AppHeader } from './app-header';
import type { ProgramSummary } from '@/lib/api-functions';

interface DashboardProps {
  readonly onSelectProgram: (instanceId: string, programId: string) => void;
  readonly onStartNewProgram: (programId: string) => void;
  readonly onContinueProgram: () => void;
  readonly onGoToProfile?: () => void;
}

// ---------------------------------------------------------------------------
// Active program card with progress bar (program-agnostic)
// ---------------------------------------------------------------------------

interface ActiveProgramCardProps {
  readonly program: ProgramSummary;
  readonly onContinue: () => void;
  readonly onGoToProfile?: () => void;
}

function ActiveProgramCard({
  program,
  onContinue,
  onGoToProfile,
}: ActiveProgramCardProps): React.ReactNode {
  const catalogQuery = useQuery({
    queryKey: queryKeys.catalog.detail(program.programId),
    queryFn: () => fetchCatalogDetail(program.programId),
    staleTime: 5 * 60 * 1000,
  });

  const definition = catalogQuery.data;

  const detailQuery = useQuery({
    queryKey: queryKeys.programs.detail(program.id),
    queryFn: () => fetchGenericProgramDetail(program.id),
  });

  // Count workouts where ALL slots have a result (program-agnostic)
  const completedWorkouts = (() => {
    if (!detailQuery.data || !definition) return 0;
    const results = detailQuery.data.results;
    let count = 0;
    for (let i = 0; i < definition.totalWorkouts; i++) {
      const dayIndex = i % definition.cycleLength;
      const day = definition.days[dayIndex];
      const workoutResult = results[String(i)];
      if (!workoutResult) continue;
      const allDone = day.slots.every((slot) => workoutResult[slot.id]?.result !== undefined);
      if (allDone) count++;
    }
    return count;
  })();

  const totalWorkouts = definition?.totalWorkouts ?? 0;
  const progressPct = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

  if (!definition) return null;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 sm:p-8 card card-glow-gold accent-left-gold edge-glow-top">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-header)] leading-tight">
            {definition.name}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {definition.description.split('.')[0]}.
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="flex items-center gap-3 mb-5"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="flex-1 h-2.5 bg-[var(--bg-progress)] overflow-hidden rounded-full">
          <div
            className="h-full bg-[var(--fill-progress)] transition-[width] duration-300 ease-out progress-fill rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="font-mono text-xs font-bold text-[var(--text-muted)] whitespace-nowrap tabular-nums">
          {completedWorkouts}/{totalWorkouts}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onContinue}
          className="px-5 py-2.5 text-xs font-bold border-2 border-[var(--btn-border)] bg-[var(--btn-hover-bg)] text-[var(--btn-hover-text)] cursor-pointer transition-all hover:opacity-90"
        >
          Continuar Entrenamiento
        </button>
        {onGoToProfile && (
          <button
            onClick={onGoToProfile}
            className="px-5 py-2.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-header)] cursor-pointer transition-colors"
          >
            Ver Perfil de Entrenamiento
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Archived/completed program card
// ---------------------------------------------------------------------------

interface OtherProgramCardProps {
  readonly program: ProgramSummary;
  readonly onContinue: (instanceId: string, programId: string) => void;
}

function OtherProgramCard({ program, onContinue }: OtherProgramCardProps): React.ReactNode {
  const catalogQuery = useQuery({
    queryKey: queryKeys.catalog.detail(program.programId),
    queryFn: () => fetchCatalogDetail(program.programId),
    staleTime: 5 * 60 * 1000,
  });

  const definition = catalogQuery.data;
  if (!definition) return null;

  const statusLabel = program.status === 'completed' ? 'completado' : program.status;
  const buttonLabel = program.status === 'completed' ? 'Ver Historial' : 'Continuar';

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 sm:p-5 flex items-center justify-between gap-3 card">
      <div>
        <span className="text-xs font-bold text-[var(--text-header)]">{program.name}</span>
        <span className="ml-2 text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
          {statusLabel}
        </span>
      </div>
      <button
        onClick={() => onContinue(program.id, program.programId)}
        className="px-4 py-2 text-xs font-bold border border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--border-light)] cursor-pointer transition-colors whitespace-nowrap"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function Dashboard({
  onSelectProgram,
  onStartNewProgram,
  onContinueProgram,
  onGoToProfile,
}: DashboardProps): React.ReactNode {
  const { user } = useAuth();

  // Fetch catalog of preset programs from API
  const catalogQuery = useQuery({
    queryKey: queryKeys.catalog.list(),
    queryFn: fetchCatalogList,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's program instances from API
  const programsQuery = useQuery({
    queryKey: queryKeys.programs.all,
    queryFn: fetchPrograms,
    enabled: user !== null,
  });

  const activeProgram = (() => {
    if (!programsQuery.data) return null;
    return programsQuery.data.find((p) => p.status === 'active') ?? null;
  })();

  const otherPrograms = (() => {
    if (!programsQuery.data) return [];
    return programsQuery.data.filter((p) => p.status !== 'active');
  })();

  return (
    <div className="min-h-dvh bg-[var(--bg-body)]">
      <AppHeader onGoToProfile={onGoToProfile} />

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* Active program loading skeleton */}
        {programsQuery.isLoading && (
          <section className="mb-12">
            <div className="h-3 w-24 bg-[var(--border-color)] rounded mb-4 animate-pulse" />
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 sm:p-6 animate-pulse">
              <div className="h-5 w-48 bg-[var(--border-color)] rounded mb-2" />
              <div className="h-3 w-64 bg-[var(--border-color)] rounded mb-4" />
              <div className="h-2 bg-[var(--bg-progress)] rounded mb-4" />
              <div className="h-10 w-52 bg-[var(--border-color)] rounded" />
            </div>
          </section>
        )}

        {/* Active program card */}
        {activeProgram && (
          <section className="mb-12">
            <h2 className="section-label mb-4">Tu Programa</h2>
            <ActiveProgramCard
              program={activeProgram}
              onContinue={onContinueProgram}
              onGoToProfile={onGoToProfile}
            />
          </section>
        )}

        {/* Other programs (archived / completed) */}
        {otherPrograms.length > 0 && (
          <section className="mb-12">
            <h2 className="section-label mb-4">Otros Programas</h2>
            <div className="flex flex-col gap-2">
              {otherPrograms.map((p) => (
                <OtherProgramCard key={p.id} program={p} onContinue={onSelectProgram} />
              ))}
            </div>
          </section>
        )}

        {/* Program catalog — all real programs from API */}
        <section>
          <h2 className="section-label mb-4">
            {activeProgram ? 'Otros Programas Disponibles' : 'Elegir un Programa'}
          </h2>
          {activeProgram && (
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Finaliza tu programa actual para iniciar uno nuevo.
            </p>
          )}

          {/* Catalog loading skeleton */}
          {catalogQuery.isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 sm:p-6 animate-pulse"
                >
                  <div className="h-4 w-32 bg-[var(--border-color)] rounded mb-2" />
                  <div className="h-3 w-56 bg-[var(--border-color)] rounded mb-4" />
                  <div className="h-3 w-24 bg-[var(--border-color)] rounded mb-4" />
                  <div className="h-10 w-36 bg-[var(--border-color)] rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Catalog loaded — render program cards */}
          {catalogQuery.data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {catalogQuery.data.map((entry) => {
                const isCurrent = activeProgram?.programId === entry.id;
                return (
                  <ProgramCard
                    key={entry.id}
                    definition={entry}
                    isActive={isCurrent}
                    disabled={activeProgram !== null && !isCurrent}
                    disabledLabel="Finaliza tu programa actual"
                    onSelect={() => {
                      if (isCurrent && activeProgram) {
                        onSelectProgram(activeProgram.id, activeProgram.programId);
                      } else {
                        onStartNewProgram(entry.id);
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
