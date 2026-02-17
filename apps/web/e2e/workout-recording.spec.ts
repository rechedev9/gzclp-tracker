import { test, expect } from '@playwright/test';
import { seedProgram } from './helpers/seed';

test.describe('Workout recording', () => {
  test.beforeEach(async ({ page }) => {
    await seedProgram(page);
    await page.goto('/app?view=tracker');
    // Wait for the program to render
    await expect(page.getByText('Week 1', { exact: true })).toBeVisible();
  });

  test('pass/fail buttons visible for workout #1', async ({ page }) => {
    // Use first() because both desktop table and mobile card have the same data-testid
    const t1Cell = page.locator('[data-testid="t1-result-0"]').first();
    await expect(t1Cell.getByRole('button').first()).toBeVisible();
    // Should have both pass (✓) and fail (✗) buttons
    await expect(t1Cell.getByRole('button')).toHaveCount(2);
  });

  test('T1 success shows toast and badge', async ({ page }) => {
    const t1Cell = page.locator('[data-testid="t1-result-0"]').first();
    // Click the pass (✓) button — first button in the cell
    await t1Cell.getByRole('button').first().click();

    // Toast should appear with success message
    await expect(page.getByText('#1: Squat T1 — Success')).toBeVisible();

    // Badge ✓ should appear in the cell
    await expect(t1Cell.getByText('✓')).toBeVisible();
  });

  test('T1 success reveals AMRAP input', async ({ page }) => {
    const t1Cell = page.locator('[data-testid="t1-result-0"]').first();
    await t1Cell.getByRole('button').first().click();

    // AMRAP input should now be visible
    await expect(page.locator('[title="AMRAP reps"]').first()).toBeVisible();
  });

  test('T2 fail shows toast and badge', async ({ page }) => {
    const t2Cell = page.locator('[data-testid="t2-result-0"]').first();
    // Click the fail (✗) button — second button in the cell
    await t2Cell.getByRole('button').nth(1).click();

    // Toast should appear with fail message
    await expect(page.getByText('#1: Bench Press T2 — Fail')).toBeVisible();

    // Badge ✗ should appear in the cell
    await expect(t2Cell.getByText('✗')).toBeVisible();
  });
});
