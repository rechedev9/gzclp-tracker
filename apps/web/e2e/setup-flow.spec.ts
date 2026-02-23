import { test, expect } from '@playwright/test';
import { authenticateOnly } from './helpers/seed';

test.describe('Setup flow', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateOnly(page);
    await page.goto('/app?view=tracker');
  });

  test('renders setup form with correct defaults', async ({ page }) => {
    await expect(page.getByText('Starting Weights (kg)')).toBeVisible();

    await expect(page.locator('#weight-squat')).toHaveValue('60');
    await expect(page.locator('#weight-bench')).toHaveValue('40');
    await expect(page.locator('#weight-deadlift')).toHaveValue('60');
    await expect(page.locator('#weight-ohp')).toHaveValue('30');
    await expect(page.locator('#weight-latpulldown')).toHaveValue('30');
    await expect(page.locator('#weight-dbrow')).toHaveValue('12.5');
  });

  test('+/- buttons adjust weight by 0.5', async ({ page }) => {
    const squatInput = page.locator('#weight-squat');
    await expect(squatInput).toHaveValue('60');

    await page.getByRole('button', { name: 'Increase Squat (T1)' }).click();
    await expect(squatInput).toHaveValue('60.5');

    await page.getByRole('button', { name: 'Decrease Squat (T1)' }).click();
    await expect(squatInput).toHaveValue('60');
  });

  test('shows validation error for weight below minimum', async ({ page }) => {
    const squatInput = page.locator('#weight-squat');
    await squatInput.fill('1');
    await squatInput.blur();

    await expect(page.getByRole('alert').filter({ hasText: 'Min 2.5 kg' })).toBeVisible();
  });

  test('Generate Program creates program and shows Week 1', async ({ page }) => {
    await page.getByRole('button', { name: 'Generate Program' }).click();

    await expect(page.getByText('Week 1', { exact: true })).toBeVisible();
    await expect(page.getByRole('progressbar').last()).toBeVisible();
  });

  test('program is persisted after setup', async ({ page }) => {
    await page.getByRole('button', { name: 'Generate Program' }).click();
    await expect(page.getByText('Week 1', { exact: true })).toBeVisible();

    // Reload — Week 1 must still appear (persisted via API, not localStorage)
    await page.reload();
    await expect(page.getByText('Week 1', { exact: true })).toBeVisible();
  });
});
