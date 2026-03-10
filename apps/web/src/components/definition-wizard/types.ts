import type { ProgramDefinition } from '@gzclp/shared/types/program';

export type WizardStepId = 'basic-info' | 'days-exercises' | 'progression';

export interface WizardState {
  readonly currentStep: WizardStepId;
  readonly definitionId: string;
  readonly definition: ProgramDefinition;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
}

export interface WizardStepProps {
  readonly definition: ProgramDefinition;
  readonly onUpdate: (partial: Partial<ProgramDefinition>) => void;
  readonly onNext: () => void;
  readonly onBack: () => void;
}

export interface DefinitionWizardProps {
  readonly definitionId: string;
  readonly onComplete: (definitionId: string) => void;
  readonly onCancel: () => void;
}

export interface ExercisePickerProps {
  readonly onSelect: (exercise: { readonly id: string; readonly name: string }) => void;
  readonly onClose: () => void;
}
