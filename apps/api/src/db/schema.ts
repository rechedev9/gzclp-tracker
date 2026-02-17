import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  smallint,
  serial,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// users — replaces Supabase Auth
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid().defaultRandom().primaryKey(),
  email: varchar({ length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: varchar({ length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  programInstances: many(programInstances),
}));

// ---------------------------------------------------------------------------
// refresh_tokens — JWT refresh token rotation
// ---------------------------------------------------------------------------

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).unique().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('refresh_tokens_user_id_idx').on(table.userId)]
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

// ---------------------------------------------------------------------------
// program_instances — user's active/archived programs
// ---------------------------------------------------------------------------

export const programInstances = pgTable(
  'program_instances',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    programId: varchar('program_id', { length: 50 }).notNull(),
    name: varchar({ length: 100 }).notNull(),
    config: jsonb().notNull(),
    status: varchar({ length: 20 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('program_instances_user_status_idx').on(table.userId, table.status),
    check('status_check', sql`${table.status} IN ('active', 'completed', 'archived')`),
  ]
);

export const programInstancesRelations = relations(programInstances, ({ one, many }) => ({
  user: one(users, { fields: [programInstances.userId], references: [users.id] }),
  workoutResults: many(workoutResults),
  undoEntries: many(undoEntries),
}));

// ---------------------------------------------------------------------------
// workout_results — normalized results (replaces JSONB blob)
// ---------------------------------------------------------------------------

export const workoutResults = pgTable(
  'workout_results',
  {
    id: serial().primaryKey(),
    instanceId: uuid('instance_id')
      .references(() => programInstances.id, { onDelete: 'cascade' })
      .notNull(),
    workoutIndex: smallint('workout_index').notNull(),
    slotId: varchar('slot_id', { length: 20 }).notNull(),
    result: varchar({ length: 10 }).notNull(),
    amrapReps: smallint('amrap_reps'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('workout_results_instance_slot_idx').on(
      table.instanceId,
      table.workoutIndex,
      table.slotId
    ),
    index('workout_results_instance_id_idx').on(table.instanceId),
  ]
);

export const workoutResultsRelations = relations(workoutResults, ({ one }) => ({
  instance: one(programInstances, {
    fields: [workoutResults.instanceId],
    references: [programInstances.id],
  }),
}));

// ---------------------------------------------------------------------------
// undo_entries — ordered undo stack (LIFO via serial PK)
// ---------------------------------------------------------------------------

export const undoEntries = pgTable(
  'undo_entries',
  {
    id: serial().primaryKey(),
    instanceId: uuid('instance_id')
      .references(() => programInstances.id, { onDelete: 'cascade' })
      .notNull(),
    workoutIndex: smallint('workout_index').notNull(),
    slotId: varchar('slot_id', { length: 20 }).notNull(),
    prevResult: varchar('prev_result', { length: 10 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('undo_entries_instance_id_idx').on(table.instanceId)]
);

export const undoEntriesRelations = relations(undoEntries, ({ one }) => ({
  instance: one(programInstances, {
    fields: [undoEntries.instanceId],
    references: [programInstances.id],
  }),
}));
