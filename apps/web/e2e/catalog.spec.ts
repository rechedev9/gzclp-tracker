import { test, expect } from '@playwright/test';
import { authenticateOnly } from './helpers/seed';

test.describe('Catalog flow', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateOnly(page);
  });

  test('dashboard loads program catalog from API', async ({ page }) => {
    await page.goto('/app');

    // Wait for catalog to load — should see at least one program name
    await expect(page.getByText('GZCLP')).toBeVisible({ timeout: 10_000 });

    // All 3 preset programs should be visible
    await expect(page.getByText('PPL 5/3/1 + Double Progression')).toBeVisible();
    await expect(page.getByText('Nivel 7')).toBeVisible();
  });

  test('user can start a GZCLP program from the catalog', async ({ page }) => {
    await page.goto('/app');

    // Wait for catalog to render
    await expect(page.getByText('GZCLP')).toBeVisible({ timeout: 10_000 });

    // Click the "Iniciar Programa" button for GZCLP
    // The GZCLP card is the first one, so its "Iniciar Programa" button is the first
    const startButtons = page.getByRole('button', { name: 'Iniciar Programa' });
    await startButtons.first().click();

    // After clicking, should see a setup form or the program's config fields
    // GZCLP setup shows weight fields (e.g., "Sentadilla" label or weight input)
    await expect(page.getByText('Sentadilla').or(page.getByText('Starting Weights'))).toBeVisible({
      timeout: 10_000,
    });
  });

  test('catalog shows program metadata (author, workouts per week)', async ({ page }) => {
    await page.goto('/app');

    await expect(page.getByText('GZCLP')).toBeVisible({ timeout: 10_000 });

    // Check that workout count and author info are rendered
    await expect(page.getByText('90 entrenamientos')).toBeVisible();
    await expect(page.getByText('Cody Lefever', { exact: false })).toBeVisible();
  });
});
