# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GZCLP Tracker — a Bun monorepo with a Next.js 16 frontend and an ElysiaJS API backend (in progress). Implements the GZCLP linear progression weightlifting program.

### Monorepo structure

```
gzclp-tracker/
├── apps/
│   ├── web/          ← Next.js 16 frontend (React 19, Tailwind CSS 4, static export)
│   └── api/          ← ElysiaJS backend (in progress)
├── packages/
│   └── shared/       ← Pure computation shared between web and API
│       └── src/
│           ├── engine.ts           (computeProgram — replay 90 workouts)
│           ├── program.ts          (GZCLP constants: DAYS, STAGES, increments)
│           ├── stats.ts            (extractChartData, calculateStats)
│           ├── type-guards.ts      (isRecord)
│           ├── types/              (TypeScript types inferred from Zod schemas)
│           ├── schemas/            (Zod v4 schemas: legacy, instance, program-definition)
│           └── programs/           (program definitions + registry)
├── package.json      (workspace root)
├── tsconfig.base.json (shared compiler options)
└── .prettierrc
```

**Workspace packages:**

- `@gzclp/shared` — import as `@gzclp/shared/engine`, `@gzclp/shared/types`, etc.
- `web` — Next.js frontend at `apps/web/`
- `api` — ElysiaJS backend at `apps/api/`

## Commands

| Task          | Command                                       |
| ------------- | --------------------------------------------- |
| Dev (all)     | `bun run dev`                                 |
| Dev (web)     | `bun run dev:web`                             |
| Dev (api)     | `bun run dev:api`                             |
| Build         | `bun run build`                               |
| Type check    | `bun run typecheck`                           |
| Lint          | `bun run lint`                                |
| Format check  | `bun run format:check`                        |
| Format fix    | `bun run prettier --write <path>`             |
| Tests (all)   | `bun run test`                                |
| Single test   | `bun test packages/shared/src/engine.test.ts` |
| E2E tests     | `bun run e2e`                                 |
| E2E (headed)  | `bun run e2e:headed`                          |
| E2E (UI mode) | `bun run e2e:ui`                              |
| Local CI      | `bun run ci`                                  |

**Test runner:** `bun:test`. Test files live alongside source (`feature.test.ts`).

- **Shared tests:** Config in `packages/shared/bunfig.toml` — root is `./src`. Test fixtures: `packages/shared/test/fixtures.ts`.
- **Web tests:** Config in `apps/web/bunfig.toml` — preloads `test/register-dom.ts` (happy-dom) and `test/setup.ts`; root is `./src`. Test helpers: `apps/web/test/helpers/`.

**E2E:** Playwright (Chromium only). Tests in `apps/web/e2e/` with `.spec.ts` extension. Builds to `out/` and serves on port 3333 via `bunx serve`. Helpers: `apps/web/e2e/helpers/`.

**Git hooks:** Lefthook — pre-commit (typecheck + lint + format, parallel), pre-push (test + build).

## Architecture

### Shared package (`packages/shared/`)

Pure computation code with zero DOM/React dependencies. Imported by both web and API:

- **`engine.ts`** — `computeProgram(startWeights, results) → WorkoutRow[]`: replays all 90 workouts with T1/T2/T3 progression rules.
- **`program.ts`** — Static GZCLP protocol: 4-day rotation (`DAYS`), T1/T2 stage definitions, weight increments.
- **`stats.ts`** — `extractChartData()` and `calculateStats()` for the stats/chart panel.
- **`schemas/legacy.ts`** — Legacy (v3) Zod schemas for persisted data.
- **`schemas/instance.ts`** — Generic `ProgramInstance` schema (program-agnostic, slot-keyed results).
- **`schemas/program-definition.ts`** — Schema for program definitions.
- **`programs/gzclp.ts`** — GZCLP program definition implementing the generic format.
- **`programs/registry.ts`** — `getProgramDefinition(id)` / `getAllPresetPrograms()`.
- **`type-guards.ts`** — `isRecord()` type guard.
- **`types/`** — All TypeScript types inferred from Zod schemas via `z.infer<>`.

### Web app (`apps/web/`)

Next.js 16 static export (`output: 'export'`). All state lives in localStorage with optional Supabase cloud sync.

**Key modules (web-only):**

- **`src/lib/storage.ts`** — Legacy localStorage CRUD. Storage key: `gzclp-v3`.
- **`src/lib/storage-v2.ts`** — New multi-program localStorage format (`wt-programs-v1`) with auto-migration.
- **`src/lib/supabase.ts`** — Singleton Supabase client; graceful degradation when env vars missing.
- **`src/lib/sync.ts`** / **`sync-machine.ts`** — Cloud sync state machine with exponential backoff.
- **`src/hooks/use-program.ts`** — Central state hook: start weights, results, undo history, localStorage persistence.
- **`src/hooks/use-cloud-sync.ts`** — React wrapper for sync state machine.
- **`src/contexts/auth-context.tsx`** — Supabase Auth with PKCE flow.

**Routes** (all client-side `'use client'`):

| Route      | Purpose                                        |
| ---------- | ---------------------------------------------- |
| `/`        | Landing page                                   |
| `/app`     | Main workout tracker (setup → tracker routing) |
| `/login`   | Auth page (sign in / sign up)                  |
| `/health`  | Health check endpoint                          |
| `/privacy` | Privacy policy                                 |

**Error boundaries:** Two-tier — root boundary in `providers.tsx`, stats boundary in `gzclp-app.tsx`. Reusable component: `src/components/error-boundary.tsx`.

## Key domain concepts

- **Tiers (T1/T2/T3):** Exercise priority levels with different set/rep schemes and progression rules
- **Stages:** When a tier fails, it advances to the next stage (fewer reps, more sets) before resetting weight
- **Results map:** `Record<workoutIndex, { t1?, t2?, t3? }>` — sparse map keyed by workout index (0–89)
- **AMRAP:** Last set of T1 and T3 exercises tracks actual reps performed (`t1Reps`, `t3Reps`)
- **Deload:** T1 resets to 90% weight after exhausting all stages; T2 adds flat +15kg

## Conventions

- Types inferred from Zod schemas via `z.infer<>`, not manually duplicated
- `zod/v4` import path (Zod v4)
- Shared code: `@gzclp/shared/*` imports (e.g., `@gzclp/shared/engine`, `@gzclp/shared/types`)
- Web internal: `@/` path alias maps to `apps/web/src/`
- All components are client-side (`'use client'`)
- Static export: no SSR, no API routes, no middleware in web app
- Supabase is optional: the app works fully offline when env vars are absent
- **Lockfile hygiene:** After any `package.json` change, always run `bun install` and commit the updated `bun.lock` in the same commit.

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
