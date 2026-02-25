-- Migration: 0015_add_performance_indexes
-- This migration is hand-written because CREATE INDEX CONCURRENTLY
-- cannot run inside a transaction. Drizzle normally wraps generated
-- migrations in a transaction, so we author raw SQL here.
--
-- CONCURRENTLY: builds the index without holding an ACCESS EXCLUSIVE
-- lock on the table, allowing reads and writes to continue during
-- index creation. The tradeoff is that the build takes longer and
-- uses more resources, but there is zero downtime.
--
-- If an index build fails mid-way, PostgreSQL marks it as INVALID.
-- A subsequent run of the same CREATE INDEX CONCURRENTLY IF NOT EXISTS
-- will detect the invalid index and rebuild it.

-- Enable pg_trgm extension for trigram-based text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on exercises.name for ILIKE '%term%' acceleration.
-- Without this index, ILIKE with a leading wildcard forces a sequential
-- scan of all rows. With pg_trgm GIN, PostgreSQL can use the index
-- to find rows matching the trigram pattern in near-O(1) time.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "exercises_name_trgm_idx"
  ON "exercises" USING gin ("name" gin_trgm_ops);

-- Composite B-tree index on the most commonly filtered columns.
-- The column order (is_preset, level, equipment, category) follows
-- the selectivity gradient: is_preset is always in the WHERE clause
-- (boolean, 2 values), followed by level (3 values), equipment
-- (~15 values), and category (~10 values). This ordering maximizes
-- index prefix utilization for partial filter combinations.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "exercises_filter_composite_idx"
  ON "exercises" ("is_preset", "level", "equipment", "category");

-- Partial index for is_compound = true (low cardinality boolean).
-- A partial index is more efficient than a full index for boolean
-- columns because it only indexes the minority rows.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "exercises_is_compound_true_idx"
  ON "exercises" ("is_compound") WHERE "is_compound" = true;

-- Composite index on program_definitions for the list query:
-- WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC
-- Enables an index-only scan for the paginated list endpoint.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "program_definitions_list_idx"
  ON "program_definitions" ("user_id", "deleted_at", "updated_at" DESC);
