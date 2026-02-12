import type { z } from 'zod/v4';
import type {
  ProgressionRuleSchema,
  StageDefinitionSchema,
  ExerciseSlotSchema,
  ProgramDaySchema,
  ConfigFieldSchema,
  ProgramDefinitionSchema,
  TierSchema,
} from '@/lib/schemas/program-definition';
import type {
  GenericResultsSchema,
  GenericUndoHistorySchema,
  ProgramInstanceSchema,
  ProgramInstanceMapSchema,
} from '@/lib/schemas/instance';
import type { PreferencesSchema } from '@/lib/schemas/preferences';

export type ProgressionRule = z.infer<typeof ProgressionRuleSchema>;
export type StageDefinition = z.infer<typeof StageDefinitionSchema>;
export type ExerciseSlot = z.infer<typeof ExerciseSlotSchema>;
export type ProgramDay = z.infer<typeof ProgramDaySchema>;
export type ConfigField = z.infer<typeof ConfigFieldSchema>;
export type ProgramDefinition = z.infer<typeof ProgramDefinitionSchema>;
export type GenericTier = z.infer<typeof TierSchema>;

export type GenericResults = z.infer<typeof GenericResultsSchema>;
export type GenericUndoEntry = GenericUndoHistory[number];
export type GenericUndoHistory = z.infer<typeof GenericUndoHistorySchema>;
export type SlotResult = GenericResults[string][string];

export type ProgramInstance = z.infer<typeof ProgramInstanceSchema>;
export type ProgramInstanceMap = z.infer<typeof ProgramInstanceMapSchema>;
export type ProgramInstanceStatus = ProgramInstance['status'];

export type Preferences = z.infer<typeof PreferencesSchema>;
