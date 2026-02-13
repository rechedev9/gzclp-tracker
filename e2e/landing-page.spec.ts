import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section', async ({ page }) => {
    await expect(page.getByText('Train Smarter.')).toBeVisible();
    await expect(page.getByText('Progress Faster.')).toBeVisible();
  });

  test('displays CTA links', async ({ page }) => {
    const startLink = page.getByRole('link', { name: 'Start Training' });
    await expect(startLink).toBeVisible();
    await expect(startLink).toHaveAttribute('href', '/login');

    const signInLink = page.getByRole('link', { name: 'Sign In' }).first();
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute('href', '/login');
  });

  test('Start Training navigates to /login', async ({ page }) => {
    await page.getByRole('link', { name: 'Start Training' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
