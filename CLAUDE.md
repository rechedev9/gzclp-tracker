# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GZCLP Tracker — a Next.js 16 app (React 19, TypeScript, Tailwind CSS 4) that implements the GZCLP linear progression weightlifting program. Static export (`output: 'export'` in next.config.ts) — no SSR, no API routes, no server components at runtime. All state lives in localStorage via Zod-validated schemas, with optional Supabase cloud sync.

## Commands

| Task          | Command                           |
| ------------- | --------------------------------- |
| Dev server    | `bun run dev`                     |
| Build         | `bun run build`                   |
| Type check    | `bun run typecheck`               |
| Lint          | `bun run lint`                    |
| Format check  | `bun run format:check`            |
| Format fix    | `bun run prettier --write <path>` |
| Tests (all)   | `bun test`                        |
| Single test   | `bun test src/lib/engine.test.ts` |
| E2E tests     | `bun run e2e`                     |
| E2E (headed)  | `bun run e2e:headed`              |
| E2E (UI mode) | `bun run e2e:ui`                  |
| Local CI      | `bun run ci`                      |

**Test runner:** `bun:test`. Test files live alongside source (`feature.test.ts`). Config in `bunfig.toml` — preloads `test/register-dom.ts` (happy-dom) and `test/setup.ts`; root is `./src`. Test helpers: `test/helpers/render.tsx`, `test/helpers/fixtures.ts`, `test/helpers/storage-helpers.ts`.

**E2E:** Playwright (Chromium only). Tests in `e2e/` with `.spec.ts` extension. Builds to `out/` and serves on port 3333 via `bunx serve`. Helpers: `e2e/helpers/fixtures.ts`, `e2e/helpers/seed.ts`.

**Git hooks:** Lefthook — pre-commit (typecheck + lint + format, parallel), pre-push (test + build).

## Architecture

### Data flow

```
schemas.ts (Zod v4) → types/index.ts (z.infer<>) → engine.ts (pure computation)
                                                   ↘
                                           use-program.ts (React state + localStorage)
                                                   ↕
                                           use-cloud-sync.ts (Supabase sync)
                                                   ↕
                                              components
```

### Core modules

- **`src/lib/program.ts`** — Static GZCLP protocol: 4-day rotation (`DAYS`), T1/T2 stage definitions, weight increments. Read-only constants.
- **`src/lib/engine.ts`** — `computeProgram(startWeights, results) → WorkoutRow[]`: pure function that replays all 90 workouts applying T1/T2/T3 progression/failure rules. No side effects.
- **`src/lib/schemas.ts`** — Legacy (v3) Zod schemas for persisted data. Single source of truth for types.
- **`src/lib/storage.ts`** — Legacy localStorage CRUD with Zod parsing. Storage key: `gzclp-v3`.
- **`src/lib/stats.ts`** — `extractChartData()` and `calculateStats()` for the stats/chart panel.

### Multi-program system (in progress)

The codebase is migrating from a single hardcoded GZCLP format to a generic multi-program architecture:

- **`src/lib/schemas/instance.ts`** — Generic `ProgramInstance` schema: program-agnostic results (`Record<slotId, SlotResult>` instead of `{t1, t2, t3}`), generic undo entries, instance status (active/completed/archived).
- **`src/lib/schemas/program-definition.ts`** — Schema for program definitions (workout templates, slot configurations).
- **`src/lib/programs/gzclp.ts`** — GZCLP program definition implementing the generic format.
- **`src/lib/programs/registry.ts`** — `getProgramDefinition(id)` / `getAllPresetPrograms()` — registry of available programs.
- **`src/lib/storage-v2.ts`** — New localStorage format (`wt-programs-v1`). Loads/saves `ProgramInstanceMap`. Falls back through: new format → legacy v3 with auto-migration.
- **`src/lib/migrations/v3-to-v1.ts`** — Converts legacy GZCLP-specific data to generic program instance format.

### Auth & sync layer

- **`src/lib/supabase.ts`** — Singleton Supabase client; returns `null` when env vars are missing (graceful degradation).
- **`src/contexts/auth-context.tsx`** — `AuthProvider` / `useAuth()` — wraps Supabase Auth with PKCE flow. Provides `signUp`, `signIn`, `signInWithGoogle`, `signOut`.
- **`src/lib/sync.ts`** — Cloud sync primitives: `fetchCloudData`, `pushToCloud`, `determineInitialSync` (handles push/pull/conflict/none).
- **`src/lib/sync-machine.ts`** — Pure state machine for sync lifecycle. Discriminated union of phases (`idle` → `initial-sync` → `synced` ↔ `debouncing` → `pushing`). Includes exponential backoff (2s, 4s, 8s) and conflict handling. No React, no async — fully testable.
- **`src/hooks/use-cloud-sync.ts`** — React wrapper that drives `sync-machine`. Debounced push on data change (2s), reconnect sync, `navigator.locks` for cross-tab mutex.
- **`src/lib/auth-errors.ts`** — Maps raw Supabase error messages to sanitized user-facing strings.

### Hooks

- **`src/hooks/use-program.ts`** — Central state hook: start weights, results, undo history. Auto-persists to localStorage. Uses `useSyncExternalStore` to avoid hydration mismatch. Exposes `markResult`, `undoLast`, `undoSpecific`, `exportData`, `importData`, `loadFromCloud`.

### Routes

All pages are client-side (`'use client'`):

| Route      | File                       | Purpose                                        |
| ---------- | -------------------------- | ---------------------------------------------- |
| `/`        | `src/app/page.tsx`         | Landing page                                   |
| `/app`     | `src/app/app/page.tsx`     | Main workout tracker (setup → tracker routing) |
| `/login`   | `src/app/login/page.tsx`   | Auth page (sign in / sign up)                  |
| `/health`  | `src/app/health/page.tsx`  | Health check endpoint                          |
| `/privacy` | `src/app/privacy/page.tsx` | Privacy policy                                 |

### Error boundaries

Two-tier strategy for crash recovery:

- **Root boundary** (`providers.tsx`) — wraps the entire provider tree. Static fallback with page reload.
- **Stats boundary** (`gzclp-app.tsx`) — wraps `<StatsPanel>` (canvas charts). Render-function fallback with retry. Isolates stats/chart failures so the workout tracker stays functional.
- Reusable component: **`src/components/error-boundary.tsx`** — class component (required by React API). Accepts `fallback: ReactNode | ((props: { error, reset }) => ReactNode)`.
- When adding new isolated feature panels, wrap them with a granular `<ErrorBoundary>`.

### Component tree

`RootLayout` → `Providers` (ErrorBoundary + AuthProvider) → `GzclpApp` (setup vs. tracker routing) → workout rows, toolbar, stats panel, etc.

## Key domain concepts

- **Tiers (T1/T2/T3):** Exercise priority levels with different set/rep schemes and progression rules
- **Stages:** When a tier fails, it advances to the next stage (fewer reps, more sets) before resetting weight
- **Results map:** `Record<workoutIndex, { t1?, t2?, t3? }>` — sparse map keyed by workout index (0–89)
- **AMRAP:** Last set of T1 and T3 exercises tracks actual reps performed (`t1Reps`, `t3Reps`)
- **Deload:** T1 resets to 90% weight after exhausting all stages; T2 adds flat +15kg

## Conventions

- Types are inferred from Zod schemas via `z.infer<>`, not manually duplicated
- `zod/v4` import path (Zod v4)
- Path alias: `@/` maps to `src/`
- All components are client-side (`'use client'`)
- `isRecord()` type guard (from `type-guards.ts`) for narrowing `unknown` → `Record<string, unknown>` — used instead of `as` casts
- Static export: no `getServerSideProps`, no API routes, no middleware — everything runs in the browser
- Supabase is optional: the app works fully offline when env vars are absent
- **Lockfile hygiene:** After any `package.json` change, always run `bun install` and commit the updated `bun.lock` in the same commit. CI uses `--frozen-lockfile` and will fail on any lockfile drift.

### ESLint strictness

**Banned in production code** (enforced as errors):

- `any` type
- `as Type` assertions (except `as const` and `satisfies`)
- `@ts-ignore`, `@ts-expect-error`
- Non-null assertions (`!`)
- `console.log` (only `console.warn` and `console.error` are allowed)
- Nesting depth > 3 levels

**Relaxed in test files** (`*.test.ts`, `*.test.tsx`, `e2e/**/*.ts`):

- `as Type` assertions allowed (for test fixtures)
- Non-null assertions (`!`) allowed

## Environment variables

Required for cloud sync (optional — app works without them):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Formatting

Prettier config (`.prettierrc`): single quotes, semicolons, 2-space indent, trailing commas (es5), 100 char print width.
