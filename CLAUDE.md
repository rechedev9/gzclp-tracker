# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GZCLP Tracker — a Next.js 16 app (React 19, TypeScript, Tailwind CSS 4) that implements the GZCLP linear progression weightlifting program. Client-side only; all state lives in localStorage via Zod-validated schemas.

## Commands

| Task       | Command         |
| ---------- | --------------- |
| Dev server | `bun run dev`   |
| Build      | `bun run build` |
| Lint       | `bun run lint`  |

No test runner is configured.

## Architecture

**Data flow:** `schemas.ts` (Zod v4 schemas) → `types/index.ts` (inferred types) → `engine.ts` (pure computation) → `use-program.ts` (React state + localStorage) → components.

- **`src/lib/program.ts`** — Static program constants: 4-day rotation (DAYS), T1/T2 stage definitions, weight increments. This is the GZCLP protocol definition.
- **`src/lib/engine.ts`** — `computeProgram()`: pure function that replays all 90 workouts from start weights + results map, applying T1/T2/T3 progression/failure rules. This is the core logic.
- **`src/lib/schemas.ts`** — Zod v4 schemas for StartWeights, Results, UndoHistory, ExportData. All persistence is validated through these.
- **`src/lib/storage.ts`** — localStorage read/write with Zod parsing; import/export helpers.
- **`src/hooks/use-program.ts`** — Single hook managing all app state: weights, results, undo history. Auto-persists to localStorage.
- **`src/components/gzclp-app.tsx`** — Root client component; orchestrates setup vs. tracker view.

**Key domain concepts:**

- **Tiers (T1/T2/T3):** Exercise priority levels with different set/rep schemes and progression rules
- **Stages:** When a tier fails, it advances to the next stage (fewer reps, more sets) before resetting weight
- **Results map:** `Record<workoutIndex, { t1?, t2?, t3? }>` — sparse map keyed by workout index (0–89)

## Conventions

- Types are inferred from Zod schemas via `z.infer<>`, not manually duplicated
- `zod/v4` import path (Zod v4 beta)
- Path alias: `@/` maps to `src/`
- All components are client-side (`'use client'`)
