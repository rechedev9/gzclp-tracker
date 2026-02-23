import { test, expect } from '@playwright/test';
import { seedProgram } from './helpers/seed';
import { buildSuccessResults } from './helpers/fixtures';

test.describe('Stats panel', () => {
  test('shows empty state when no results', async ({ page }) => {
    await seedProgram(page);
    await page.goto('/app?view=tracker');
    // Wait for the Stats & Charts tab to appear (tracker loaded)
    await expect(page.getByRole('button', { name: 'Stats & Charts' })).toBeVisible();

    // Switch to Stats tab
    await page.getByRole('button', { name: 'Stats & Charts' }).click();

    await expect(page.getByText('No data yet')).toBeVisible();
  });

  test('shows summary cards with exercise names', async ({ page }) => {
    await seedProgram(page, { results: buildSuccessResults(4) });
    await page.goto('/app?view=tracker');
    await expect(page.getByRole('progressbar').last()).toBeVisible();

    // Switch to Stats tab
    await page.getByRole('button', { name: 'Stats & Charts' }).click();

    // Summary card headings should show T1 exercise names
    await expect(page.getByRole('heading', { name: 'Squat', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bench Press', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Deadlift', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'OHP', exact: true })).toBeVisible();
  });

  test('summary cards display weight in kg', async ({ page }) => {
    await seedProgram(page, { results: buildSuccessResults(4) });
    await page.goto('/app?view=tracker');
    await expect(page.getByRole('progressbar').last()).toBeVisible();

    await page.getByRole('button', { name: 'Stats & Charts' }).click();

    // At least one "kg" text should be visible in the stats panel
    await expect(page.getByText('kg').first()).toBeVisible();
  });

  test('renders chart canvas elements', async ({ page }) => {
    await seedProgram(page, { results: buildSuccessResults(4) });
    await page.goto('/app?view=tracker');
    await expect(page.getByRole('progressbar').last()).toBeVisible();

    await page.getByRole('button', { name: 'Stats & Charts' }).click();

    // Charts use canvas elements for rendering
    const canvases = page.locator('canvas');
    await expect(canvases.first()).toBeVisible();
  });
});
