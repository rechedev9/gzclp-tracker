import { useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProgramPreview } from '@/hooks/use-program-preview';
import { useToast } from '@/contexts/toast-context';
import { getViewPreference, saveViewPreference } from '@/lib/view-preference';
import type { ViewMode } from '@/lib/view-preference';
import { DayNavigator } from './day-navigator';
import { DayView } from './day-view';
import { DetailedDayView } from './detailed-day-view';
import { ToastContainer } from './toast';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CTA_MESSAGE = 'Crea una cuenta para registrar tu progreso';
const CTA_LABEL = 'Crear cuenta';
const CURRENT_DAY_INDEX = 0;

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function PreviewSkeleton(): ReactNode {
  return (
    <div className="animate-pulse space-y-4 px-4 sm:px-6 py-6 max-w-2xl mx-auto">
      <div className="h-8 bg-rule rounded-sm w-1/3" />
      <div className="h-5 bg-rule rounded-sm w-2/3" />
      <div className="space-y-3 mt-6">
        <div className="h-24 bg-rule rounded-sm" />
        <div className="h-24 bg-rule rounded-sm" />
        <div className="h-24 bg-rule rounded-sm" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function PreviewError({ onRetry }: { readonly onRetry: () => void }): ReactNode {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-muted mb-2 text-sm">Programa no encontrado</p>
      <p className="text-muted mb-6 text-xs">
        El programa solicitado no existe o no se pudo cargar.
      </p>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="px-5 py-2 bg-accent text-white font-bold cursor-pointer text-sm"
        >
          Reintentar
        </button>
        <Link to="/" className="text-xs text-muted hover:text-main transition-colors">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProgramPreviewPage(): ReactNode {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { definition, rows, isLoading, isError } = useProgramPreview(programId ?? '');

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>(() => getViewPreference());

  // ---------------------------------------------------------------------------
  // CTA handler — all interactive callbacks point here
  // ---------------------------------------------------------------------------

  const showCtaToast = (): void => {
    toast({
      message: CTA_MESSAGE,
      action: {
        label: CTA_LABEL,
        onClick: () => navigate('/login'),
      },
    });
  };

  // CTA callback stubs — parameterless arrows are assignable to DayViewProps
  // callbacks via TypeScript's function subtyping (fewer params → compatible).
  const handleMark = (): void => showCtaToast();
  const handleUndo = (): void => showCtaToast();
  const handleSetAmrapReps = (): void => showCtaToast();
  const handleSetRpe = (): void => showCtaToast();
  const handleSetTap = (): void => showCtaToast();

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------

  const handlePrevDay = (): void => {
    setSelectedDayIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextDay = (): void => {
    setSelectedDayIndex((prev) => Math.min(rows.length - 1, prev + 1));
  };

  const handleGoToCurrent = (): void => {
    setSelectedDayIndex(CURRENT_DAY_INDEX);
  };

  // ---------------------------------------------------------------------------
  // View toggle
  // ---------------------------------------------------------------------------

  const handleToggleView = (): void => {
    const next: ViewMode = viewMode === 'detailed' ? 'compact' : 'detailed';
    setViewMode(next);
    saveViewPreference(next);
  };

  // ---------------------------------------------------------------------------
  // Retry handler for error state
  // ---------------------------------------------------------------------------

  const handleRetry = (): void => {
    window.location.reload();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="grain-overlay min-h-dvh bg-body">
        <PreviewSkeleton />
      </div>
    );
  }

  if (isError || !definition || rows.length === 0) {
    return (
      <div className="grain-overlay min-h-dvh bg-body">
        <PreviewError onRetry={handleRetry} />
      </div>
    );
  }

  const selectedWorkout = rows[selectedDayIndex];
  const totalWorkouts = definition.totalWorkouts;
  const isDayComplete = false;

  return (
    <div className="grain-overlay min-h-dvh bg-body">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 bg-header/95 backdrop-blur-md border-b border-rule">
        <Link
          to="/"
          className="text-xs font-bold text-muted hover:text-main transition-colors"
          aria-label="Volver al inicio"
        >
          &larr; Inicio
        </Link>
        <span className="font-display text-sm tracking-wide text-title truncate mx-4">
          {definition.name}
        </span>
        <Link
          to="/login"
          className="font-mono text-xs font-bold tracking-widest uppercase text-btn-text border border-btn-ring px-4 py-2 hover:bg-btn-active hover:text-btn-active-text transition-all duration-200"
        >
          Comenzar
        </Link>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Program info — expanded by default */}
        <details open className="group bg-card border border-rule mb-4 sm:mb-8 overflow-hidden">
          <summary className="px-5 py-3.5 font-bold cursor-pointer select-none flex justify-between items-center [&::marker]:hidden list-none text-xs tracking-wide">
            Acerca de {definition.name}
            <span className="transition-transform duration-200 group-open:rotate-90">&#9656;</span>
          </summary>
          <div className="px-5 pb-5 border-t border-rule-light">
            <p className="mt-3 text-sm leading-7 text-info">{definition.description}</p>
            {definition.author && (
              <p className="mt-2 text-xs text-muted">Por {definition.author}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted">
              <span>{totalWorkouts} entrenamientos en total</span>
              <span>{definition.workoutsPerWeek} por semana</span>
              <span>Rotaci&oacute;n de {definition.days.length} d&iacute;as</span>
            </div>
          </div>
        </details>

        {/* Day navigator */}
        <DayNavigator
          selectedDayIndex={selectedDayIndex}
          totalDays={totalWorkouts}
          currentDayIndex={CURRENT_DAY_INDEX}
          dayName={selectedWorkout?.dayName ?? ''}
          isDayComplete={isDayComplete}
          onPrev={handlePrevDay}
          onNext={handleNextDay}
          onGoToCurrent={handleGoToCurrent}
        />

        {/* View mode toggle */}
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={handleToggleView}
            aria-label={
              viewMode === 'detailed' ? 'Cambiar a vista compacta' : 'Cambiar a vista detallada'
            }
            className="text-2xs font-bold text-muted hover:text-main tracking-wide uppercase cursor-pointer transition-colors"
          >
            {viewMode === 'detailed' ? 'Vista compacta' : 'Vista detallada'}
          </button>
        </div>

        {/* Workout view */}
        {selectedWorkout &&
          (viewMode === 'detailed' ? (
            <DetailedDayView
              workout={selectedWorkout}
              isCurrent={true}
              onMark={handleMark}
              onUndo={handleUndo}
              onSetAmrapReps={handleSetAmrapReps}
              onSetRpe={handleSetRpe}
              onSetTap={handleSetTap}
            />
          ) : (
            <DayView
              workout={selectedWorkout}
              isCurrent={true}
              onMark={handleMark}
              onUndo={handleUndo}
              onSetAmrapReps={handleSetAmrapReps}
              onSetRpe={handleSetRpe}
              onSetTap={handleSetTap}
            />
          ))}
      </div>

      <ToastContainer />
    </div>
  );
}
