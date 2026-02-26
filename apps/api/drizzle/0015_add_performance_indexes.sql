-- Migration: 0015_add_performance_indexes
--
-- NOTE: CONCURRENTLY was removed because Drizzle's migrator wraps
-- migrations in a transaction, and CREATE INDEX CONCURRENTLY cannot
-- run inside a transaction block. At our current scale (~675 exercises,
-- few program_definitions), regular CREATE INDEX completes in <100ms
-- and the brief ACCESS EXCLUSIVE lock is negligible.
--
-- Each statement is separated by --> statement-breakpoint so Drizzle
-- executes them individually (multi-statement sql.raw() fails in postgres-js).

CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exercises_name_trgm_idx"
  ON "exercises" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exercises_filter_composite_idx"
  ON "exercises" ("is_preset", "level", "equipment", "category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exercises_is_compound_true_idx"
  ON "exercises" ("is_compound") WHERE "is_compound" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_definitions_list_idx"
  ON "program_definitions" ("user_id", "deleted_at", "updated_at" DESC);
