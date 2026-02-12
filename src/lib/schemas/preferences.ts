import { z } from 'zod/v4';

export const PreferencesSchema = z.strictObject({
  unit: z.enum(['kg', 'lb']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultProgramId: z.string().optional(),
});
