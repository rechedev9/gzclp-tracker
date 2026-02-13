import { test, expect } from '@playwright/test';
import { seedProgram } from './helpers/seed';

test.describe('Undo', () => {
  test.beforeEach(async ({ page }) => {
    await seedProgram(page);
    await page.goto('/app?view=tracker');
    await expect(page.getByText('Week 1', { exact: true })).toBeVisible();
  });

  test('undo button disabled when no history', async ({ page }) => {
    // The toolbar undo button is the first "Undo" button on the page
    const undoBtn = page.getByRole('button', { name: 'Undo', exact: true }).first();
    await expect(undoBtn).toBeDisabled();
  });

  test('record T1 then undo via toolbar', async ({ page }) => {
    const t1Cell = page.locator('[data-testid="t1-result-0"]').first();
    const undoBtn = page.getByRole('button', { name: 'Undo', exact: true }).first();

    // Record T1 success
    await t1Cell.getByRole('button').first().click();
    await expect(t1Cell.getByText('✓')).toBeVisible();

    // Undo via toolbar button
    await expect(undoBtn).toBeEnabled();
    await undoBtn.click();

    // Pass/fail buttons should reappear (2 buttons instead of 1 badge)
    await expect(t1Cell.getByRole('button')).toHaveCount(2);
    await expect(undoBtn).toBeDisabled();
  });

  test('record T1 then undo via badge click', async ({ page }) => {
    const t1Cell = page.locator('[data-testid="t1-result-0"]').first();

    // Record T1 success
    await t1Cell.getByRole('button').first().click();
    const badge = t1Cell.getByText('✓');
    await expect(badge).toBeVisible();

    // Click badge to undo (badge is a button)
    await badge.click();

    // Pass/fail buttons should reappear
    await expect(t1Cell.getByRole('button')).toHaveCount(2);
  });

  test('undo count text updates', async ({ page }) => {
    const t1Cell = page.locator('[data-testid="t1-result-0"]').first();

    // No undo count shown initially — the "N undo" span is not rendered
    await expect(page.getByText('1 undo')).not.toBeVisible();

    // Record T1 success
    await t1Cell.getByRole('button').first().click();
    await expect(page.getByText('1 undo')).toBeVisible();
  });
});
