import type { Page } from '@playwright/test';
import { DEFAULT_WEIGHTS } from './fixtures';
import { createAndAuthUser, createTestProgram, seedResultsViaAPI } from './api';

interface SeedOptions {
  readonly startWeights?: typeof DEFAULT_WEIGHTS;
  readonly results?: Record<string, Record<string, string>>;
}

/**
 * Creates a test user, authenticates them (setting cookies on the browser context),
 * and creates a GZCLP program. Must be called BEFORE page.goto() so that
 * the refresh_token cookie is present when AuthProvider fires.
 */
export async function seedProgram(page: Page, overrides?: SeedOptions): Promise<void> {
  const { accessToken } = await createAndAuthUser(page);
  const programId = await createTestProgram(page, accessToken, overrides?.startWeights);
  if (overrides?.results) {
    await seedResultsViaAPI(page, accessToken, programId, overrides.results);
  }
}

/** Authenticate only — no program created (for setup-flow tests). */
export async function authenticateOnly(page: Page): Promise<void> {
  await createAndAuthUser(page);
}

/** Read a localStorage key and parse it as JSON. */
export async function readStorage(page: Page, key: string): Promise<unknown> {
  return page.evaluate((k: string) => {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  }, key);
}
