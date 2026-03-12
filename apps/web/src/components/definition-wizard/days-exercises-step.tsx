import { useState } from 'react';
import type { ProgramDefinition } from '@gzclp/shared/types/program';
import { Button } from '@/components/button';
import { ExercisePicker } from './exercise-picker';
import type { WizardStepProps } from './types';

const MAX_DAYS = 7;

interface PickerTarget {
  readonly dayIndex: number;
}

function generateSlotId(dayIndex: number, slotIndex: number): string {
  return `d${dayIndex + 1}-s${slotIndex + 1}`;
}

export function DaysAndExercisesStep({
  definition,
  onUpdate,
  onNext,
  onBack,
}: WizardStepProps): React.ReactNode {
  const [days, setDays] = useState(() =>
    definition.days.map((d) => ({
      name: d.name,
      slots: d.slots.map((s) => ({
        id: s.id,
        exerciseId: s.exerciseId,
        exerciseName: definition.exercises[s.exerciseId]?.name ?? s.exerciseId,
      })),
    }))
  );
  const [selectedDay, setSelectedDay] = useState(0);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddDay = (): void => {
    if (days.length >= MAX_DAYS) return;
    const newIndex = days.length;
    setDays((prev) => [...prev, { name: `Dia ${newIndex + 1}`, slots: [] }]);
    setSelectedDay(newIndex);
  };

  const handleRemoveDay = (index: number): void => {
    if (days.length <= 1) return;
    setDays((prev) => prev.filter((_, i) => i !== index));
    setSelectedDay((prev) => Math.min(prev, days.length - 2));
  };

  const handleDayNameChange = (index: number, name: string): void => {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, name } : d)));
  };

  const handleRemoveSlot = (dayIndex: number, slotIndex: number): void => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, slots: d.slots.filter((_, si) => si !== slotIndex) } : d
      )
    );
  };

  const handleExerciseSelected = (exercise: {
    readonly id: string;
    readonly name: string;
  }): void => {
    if (pickerTarget === null) return;
    const { dayIndex } = pickerTarget;
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d;
        const slotIndex = d.slots.length;
        return {
          ...d,
          slots: [
            ...d.slots,
            {
              id: generateSlotId(dayIndex, slotIndex),
              exerciseId: exercise.id,
              exerciseName: exercise.name,
            },
          ],
        };
      })
    );
    setPickerTarget(null);
  };

  const validate = (): boolean => {
    for (let i = 0; i < days.length; i++) {
      if (days[i].slots.length === 0) {
        setError(`El dia "${days[i].name}" necesita al menos un ejercicio`);
        setSelectedDay(i);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleNext = (): void => {
    if (!validate()) return;

    // Build updated definition data
    const exercises: Record<string, { readonly name: string }> = {};
    const newSlotDefaults: Pick<
      ProgramDefinition['days'][number]['slots'][number],
      'tier' | 'stages' | 'onSuccess' | 'onMidStageFail' | 'onFinalStageFail'
    > = {
      tier: 't1',
      stages: [{ sets: 3, reps: 10 }],
      onSuccess: { type: 'add_weight' },
      onMidStageFail: { type: 'no_change' },
      onFinalStageFail: { type: 'deload_percent', percent: 10 },
    };
    const updatedDays: ProgramDefinition['days'] = days.map((day, dayIdx) => ({
      name: day.name,
      slots: day.slots.map((slot, slotIdx) => {
        exercises[slot.exerciseId] = { name: slot.exerciseName };
        const existingSlot = definition.days[dayIdx]?.slots[slotIdx];
        if (existingSlot) {
          return {
            ...existingSlot,
            id: generateSlotId(dayIdx, slotIdx),
            exerciseId: slot.exerciseId,
          };
        }
        return {
          ...newSlotDefaults,
          id: generateSlotId(dayIdx, slotIdx),
          exerciseId: slot.exerciseId,
          startWeightKey: slot.exerciseId,
        };
      }),
    }));

    // Build configFields for each unique exercise
    const seenKeys = new Set<string>();
    const configFields: ProgramDefinition['configFields'] = [];
    for (const day of updatedDays) {
      for (const slot of day.slots) {
        if (!seenKeys.has(slot.startWeightKey)) {
          seenKeys.add(slot.startWeightKey);
          configFields.push({
            key: slot.startWeightKey,
            label: exercises[slot.exerciseId]?.name ?? slot.exerciseId,
            type: 'weight' as const,
            min: 0,
            step: 2.5,
          });
        }
      }
    }

    // Build weightIncrements for each unique exercise
    const weightIncrements: Record<string, number> = {};
    for (const key of seenKeys) {
      weightIncrements[key] = 2.5;
    }

    onUpdate({
      days: updatedDays,
      exercises,
      configFields,
      weightIncrements,
      cycleLength: updatedDays.length,
    });
    onNext();
  };

  const currentDay = days[selectedDay];

  return (
    <div className="space-y-4">
      {/* Day tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {days.map((day, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelectedDay(i)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              i === selectedDay
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
            }`}
          >
            {day.name}
          </button>
        ))}
        {days.length < MAX_DAYS && (
          <button
            type="button"
            onClick={handleAddDay}
            className="px-3 py-1.5 text-xs font-bold text-zinc-500 border border-dashed border-zinc-600 rounded-lg hover:text-zinc-300 hover:border-zinc-500 transition-colors cursor-pointer"
          >
            + Dia
          </button>
        )}
      </div>

      {/* Current day editor */}
      {currentDay && (
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={currentDay.name}
              onChange={(e) => handleDayNameChange(selectedDay, e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none transition-colors"
              placeholder="Nombre del dia"
            />
            {days.length > 1 && (
              <Button variant="danger" size="sm" onClick={() => handleRemoveDay(selectedDay)}>
                Eliminar dia
              </Button>
            )}
          </div>

          {/* Exercise slots */}
          <div className="space-y-2">
            {currentDay.slots.map((slot, slotIdx) => (
              <div
                key={slot.id}
                className="flex items-center justify-between bg-zinc-900/50 border border-zinc-700/30 rounded-lg px-3 py-2.5"
              >
                <span className="text-sm text-zinc-200">{slot.exerciseName}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(selectedDay, slotIdx)}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                  aria-label={`Eliminar ${slot.exerciseName}`}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPickerTarget({ dayIndex: selectedDay })}
          >
            + Agregar ejercicio
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          Atras
        </Button>
        <Button variant="primary" onClick={handleNext}>
          Siguiente
        </Button>
      </div>

      {pickerTarget !== null && (
        <ExercisePicker onSelect={handleExerciseSelected} onClose={() => setPickerTarget(null)} />
      )}
    </div>
  );
}
