# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GZCLP Tracker — a Bun monorepo with a Vite + React 19 SPA frontend and an ElysiaJS API backend. Implements the GZCLP linear progression weightlifting program.

### Monorepo structure

```
gzclp-tracker/
├── apps/
│   ├── web/          ← Vite + React 19 SPA (react-router-dom v7, Tailwind CSS 4)
│   └── api/          ← ElysiaJS backend (Bun, PostgreSQL, Redis, JWT auth)
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
- `web` — Vite React SPA at `apps/web/`
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

**E2E:** Playwright (Chromium only). Tests in `apps/web/e2e/` with `.spec.ts` extension. The webServer command is `bun run build:web && bun run dev:api` — it builds the web app to `dist/` and starts the API (which serves the SPA). BaseURL is `http://localhost:3001`. Helpers: `apps/web/e2e/helpers/`.

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

Vite SPA with react-router-dom v7. All state is server-authoritative — the frontend communicates exclusively with the ElysiaJS API. Auth is JWT-based: short-lived access token stored in-memory, refresh token in an httpOnly cookie.

**Key modules (web-only):**

- **`src/lib/api.ts`** — In-memory access token management + promise-based refresh mutex (prevents concurrent refresh races on 401).
- **`src/lib/api-functions.ts`** — Typed fetch wrappers for all API endpoints (programs, results, auth).
- **`src/lib/auth-errors.ts`** — Auth error parsing and user-facing message formatting.
- **`src/lib/query-keys.ts`** — TanStack Query key factory.
- **`src/hooks/use-program.ts`** — Central state hook: TanStack Query + optimistic mutations for results/weights/undo.
- **`src/contexts/auth-context.tsx`** — JWT auth context: `signUp`/`signIn`/`signOut` via API, session restored on mount via refresh cookie.

**Provider tree** (outermost → innermost):

1. `providers.tsx` — `ErrorBoundary` (root reload fallback) + `QueryClientProvider`
2. `root-layout.tsx` — `AuthProvider` + `ToastProvider` (wraps all routes via `<Outlet />`)

**Routes** (defined in `src/main.tsx`, all client-side SPA routing):

| Route              | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `/`                | Landing page                                   |
| `/app`             | Main workout tracker (setup → tracker routing) |
| `/login`           | Auth page (sign in / sign up)                  |
| `/forgot-password` | Password reset request                         |
| `/reset-password`  | Password reset confirmation                    |
| `/privacy`         | Privacy policy                                 |
| `*`                | 404 Not Found                                  |

**Error boundaries:** Two-tier — root boundary in `providers.tsx` (reload fallback), stats boundary in `gzclp-app.tsx` (reset fallback). Reusable component: `src/components/error-boundary.tsx`.

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
- `VITE_API_URL` is **required for production builds** — it is baked into the bundle at build time. The build will throw if unset. In development it defaults to `http://localhost:3001`.
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

**Web (`apps/web/`):**

- `VITE_API_URL` — Required for production. URL of the ElysiaJS API (e.g. `https://api.example.com`).

**API (`apps/api/`):** PostgreSQL connection, Redis URL, JWT secrets — see `apps/api/.env.example` if present.

## Formatting

Prettier config (`.prettierrc`): single quotes, semicolons, 2-space indent, trailing commas (es5), 100 char print width.
