import type { Page } from '@playwright/test';
import { STORAGE_KEY, buildStoredData } from './fixtures';

type StoredDataInput = Parameters<typeof buildStoredData>[0];

/**
 * Seed localStorage with program data before navigation.
 * Must be called BEFORE page.goto() — uses addInitScript to run
 * before any page JS executes.
 */
export async function seedProgram(page: Page, overrides?: StoredDataInput): Promise<void> {
  const data = buildStoredData(overrides);
  const json = JSON.stringify(data);
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: json }
  );
}

/** Remove all app-related localStorage keys. */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate((key: string) => {
    localStorage.removeItem(key);
  }, STORAGE_KEY);
}

/** Read a localStorage key and parse it as JSON. */
export async function readStorage(page: Page, key: string = STORAGE_KEY): Promise<unknown> {
  return page.evaluate((k: string) => {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  }, key);
}
