import { useState } from 'react';
import type { ProgramDefinition } from '@gzclp/shared/types/program';
import { Button } from '@/components/button';
import { PROGRESSION_TEMPLATES } from './progression-templates';
import type { WizardStepProps } from './types';

const MIN_SETS = 1;
const MAX_SETS = 20;
const MIN_REPS = 1;
const MAX_REPS = 100;

interface SlotConfig {
  readonly dayIndex: number;
  readonly slotIndex: number;
  readonly exerciseName: string;
  readonly sets: number;
  readonly reps: number;
  readonly templateId: string;
}

function buildInitialSlots(definition: ProgramDefinition): readonly SlotConfig[] {
  const configs: SlotConfig[] = [];
  for (let di = 0; di < definition.days.length; di++) {
    const day = definition.days[di];
    for (let si = 0; si < day.slots.length; si++) {
      const slot = day.slots[si];
      const name = definition.exercises[slot.exerciseId]?.name ?? slot.exerciseId;
      const stage = slot.stages[0];
      // Try to match an existing progression template
      const matchedTemplate = PROGRESSION_TEMPLATES.find(
        (t) => t.onSuccess.type === slot.onSuccess.type
      );
      configs.push({
        dayIndex: di,
        slotIndex: si,
        exerciseName: name,
        sets: stage?.sets ?? 3,
        reps: stage?.reps ?? 10,
        templateId: matchedTemplate?.id ?? 'linear',
      });
    }
  }
  return configs;
}

interface ProgressionStepExtraProps extends WizardStepProps {
  readonly onSaveAndStart: () => void;
  readonly onSaveDraft: () => void;
  readonly isSaving: boolean;
}

export function ProgressionStep({
  definition,
  onUpdate,
  onBack,
  onSaveAndStart,
  onSaveDraft,
  isSaving,
}: ProgressionStepExtraProps): React.ReactNode {
  const [slots, setSlots] = useState(() => buildInitialSlots(definition));
  const [error, setError] = useState<string | null>(null);

  const updateSlot = (
    dayIndex: number,
    slotIndex: number,
    field: 'sets' | 'reps' | 'templateId',
    value: string | number
  ): void => {
    setSlots((prev) =>
      prev.map((s) =>
        s.dayIndex === dayIndex && s.slotIndex === slotIndex ? { ...s, [field]: value } : s
      )
    );
  };

  const validate = (): boolean => {
    for (const slot of slots) {
      if (slot.sets < MIN_SETS || slot.sets > MAX_SETS) {
        setError(`${slot.exerciseName}: las series deben ser entre ${MIN_SETS} y ${MAX_SETS}`);
        return false;
      }
      if (slot.reps < MIN_REPS || slot.reps > MAX_REPS) {
        setError(
          `${slot.exerciseName}: las repeticiones deben ser entre ${MIN_REPS} y ${MAX_REPS}`
        );
        return false;
      }
    }
    setError(null);
    return true;
  };

  const applyAndSave = (startAfter: boolean): void => {
    if (!validate()) return;

    // Build updated days with progression rules
    const updatedDays: ProgramDefinition['days'] = definition.days.map((day, di) => ({
      name: day.name,
      slots: day.slots.map((origSlot, si) => {
        const config = slots.find((s) => s.dayIndex === di && s.slotIndex === si);
        if (!config) return origSlot;
        const template = PROGRESSION_TEMPLATES.find((t) => t.id === config.templateId);
        if (!template) return origSlot;
        return {
          ...origSlot,
          stages: template.defaultStages.map((stage) => ({
            ...stage,
            sets: config.sets,
            reps: config.reps,
          })),
          onSuccess: template.onSuccess,
          onMidStageFail: template.onMidStageFail,
          onFinalStageFail: template.onFinalStageFail,
        };
      }),
    }));

    // Compute totalWorkouts based on cycle length and a default of 90 / cycleLength rounded
    const cycleLength = updatedDays.length;
    const totalWorkouts = cycleLength * 15; // Sensible default: 15 cycles

    onUpdate({
      days: updatedDays,
      totalWorkouts,
      workoutsPerWeek: Math.min(cycleLength, 6),
    });

    if (startAfter) {
      onSaveAndStart();
    } else {
      onSaveDraft();
    }
  };

  // Group slots by day for display
  const groupedByDay = new Map<number, SlotConfig[]>();
  for (const slot of slots) {
    const list = groupedByDay.get(slot.dayIndex) ?? [];
    list.push(slot);
    groupedByDay.set(slot.dayIndex, list);
  }

  return (
    <div className="space-y-4">
      {Array.from(groupedByDay.entries()).map(([dayIndex, daySlots]) => {
        const dayName = definition.days[dayIndex]?.name ?? `Dia ${dayIndex + 1}`;
        return (
          <div key={dayIndex}>
            <h4 className="text-xs font-bold text-zinc-400 mb-2">{dayName}</h4>
            <div className="space-y-3">
              {daySlots.map((slot) => (
                <div
                  key={`${slot.dayIndex}-${slot.slotIndex}`}
                  className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4"
                >
                  <p className="text-sm font-medium text-zinc-200 mb-3">{slot.exerciseName}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-2xs text-zinc-500 mb-1">Series</label>
                      <input
                        type="number"
                        min={MIN_SETS}
                        max={MAX_SETS}
                        value={slot.sets}
                        onChange={(e) =>
                          updateSlot(slot.dayIndex, slot.slotIndex, 'sets', Number(e.target.value))
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none transition-colors text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs text-zinc-500 mb-1">Reps</label>
                      <input
                        type="number"
                        min={MIN_REPS}
                        max={MAX_REPS}
                        value={slot.reps}
                        onChange={(e) =>
                          updateSlot(slot.dayIndex, slot.slotIndex, 'reps', Number(e.target.value))
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none transition-colors text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs text-zinc-500 mb-1">Progresion</label>
                      <select
                        value={slot.templateId}
                        onChange={(e) =>
                          updateSlot(slot.dayIndex, slot.slotIndex, 'templateId', e.target.value)
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none transition-colors"
                      >
                        {PROGRESSION_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
        <Button variant="ghost" onClick={onBack} disabled={isSaving}>
          Atras
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => applyAndSave(false)} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar borrador'}
          </Button>
          <Button variant="primary" onClick={() => applyAndSave(true)} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar y empezar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
