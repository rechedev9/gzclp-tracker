import { test, expect } from '@playwright/test';
import { seedProgram } from './helpers/seed';
import { buildSuccessResults } from './helpers/fixtures';

test.describe('Progression rules', () => {
  test('weight increases after successful workouts', async ({ page }) => {
    // Seed 4 all-success workouts (indices 0–3, one full rotation)
    await seedProgram(page, { results: buildSuccessResults(4) });
    await page.goto('/app?view=tracker');
    await expect(page.getByText('Week 2', { exact: true })).toBeVisible();

    // Workout #5 (index 4) is Day 1 = Squat T1
    // Squat T1 should show 65 kg (60 start + 5 increment)
    const t1Weight = page.locator('[data-testid="t1-weight-4"]').first();
    await expect(t1Weight).toHaveText('65');
  });

  test('T1 failure advances stage without changing weight', async ({ page }) => {
    // Seed workout 0 with T1 fail (other tiers success)
    await seedProgram(page, {
      results: {
        '0': { t1: 'fail', t2: 'success', t3: 'success' },
        '1': { t1: 'success', t2: 'success', t3: 'success' },
        '2': { t1: 'success', t2: 'success', t3: 'success' },
        '3': { t1: 'success', t2: 'success', t3: 'success' },
      },
    });
    await page.goto('/app?view=tracker');
    await expect(page.getByText('Week 2', { exact: true })).toBeVisible();

    // Workout #5 (index 4) T1 Squat: weight stays 60, stage changes to 6×2
    const t1Weight = page.locator('[data-testid="t1-weight-4"]').first();
    await expect(t1Weight).toHaveText('60');

    const t1Scheme = page.locator('[data-testid="t1-scheme-4"]').first();
    await expect(t1Scheme).toContainText('6×2');
  });
});
