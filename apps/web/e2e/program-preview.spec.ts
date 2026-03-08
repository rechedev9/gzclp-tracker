import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// 4.2 — Route and rendering (REQ-ROUTE-001, REQ-ROUTE-003, REQ-ROUTE-004,
//        REQ-ROUTE-007, REQ-ROUTE-008)
// ---------------------------------------------------------------------------

test.describe('Program preview — route and rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/programs/gzclp');
  });

  test('renders the program name', async ({ page }) => {
    await expect(page.getByText('GZCLP')).toBeVisible({ timeout: 10_000 });
  });

  test('program info section is expanded by default', async ({ page }) => {
    // Wait for definition to load
    await expect(page.getByText('GZCLP')).toBeVisible({ timeout: 10_000 });

    // The <details open> element should have its content visible
    const description = page.getByText('Acerca de GZCLP');
    await expect(description).toBeVisible();

    // Metadata inside the details section should also be visible
    await expect(page.getByText('entrenamientos en total')).toBeVisible();
  });

  test('stats tab is not visible', async ({ page }) => {
    await expect(page.getByText('GZCLP')).toBeVisible({ timeout: 10_000 });

    // Verify no stats-related UI is present
    await expect(page.getByText('Estadísticas')).not.toBeVisible();
    await expect(page.getByRole('tab', { name: /estad/i })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4.3 — Interactivity (REQ-ROUTE-005, REQ-ROUTE-006, REQ-ROUTE-009)
// ---------------------------------------------------------------------------

test.describe('Program preview — interactivity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/programs/gzclp');
    // Wait for the tracker to be fully loaded
    await expect(page.getByText('GZCLP')).toBeVisible({ timeout: 10_000 });
  });

  test('day navigation works (next and prev)', async ({ page }) => {
    // Verify we start at Day 1
    await expect(page.getByText('Día 1')).toBeVisible();

    // Click "Siguiente día" (Next) button
    const nextBtn = page.getByRole('button', { name: 'Siguiente día' });
    await nextBtn.click();

    // Now on Day 2
    await expect(page.getByText('Día 2')).toBeVisible();

    // Click "Día anterior" (Prev) button
    const prevBtn = page.getByRole('button', { name: 'Día anterior' });
    await prevBtn.click();

    // Back to Day 1
    await expect(page.getByText('Día 1')).toBeVisible();
  });

  test('view toggle switches between detailed and compact', async ({ page }) => {
    // Default view mode is detailed — toggle button shows "Vista compacta"
    const toggleBtn = page.getByRole('button', { name: 'Cambiar a vista compacta' });
    await expect(toggleBtn).toBeVisible();

    // Switch to compact view
    await toggleBtn.click();

    // Now toggle should show "Cambiar a vista detallada"
    const detailedToggle = page.getByRole('button', { name: 'Cambiar a vista detallada' });
    await expect(detailedToggle).toBeVisible();
  });

  test('clicking pass/fail shows CTA toast', async ({ page }) => {
    // Find a pass (success) button — aria-label pattern: "Marcar {tier} éxito"
    const passBtn = page.getByRole('button', { name: /Marcar .+ éxito/ }).first();
    await passBtn.click();

    // CTA toast should appear with the signup message
    await expect(page.getByText('Crea una cuenta para registrar tu progreso')).toBeVisible();

    // Toast should have the action button
    await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible();
  });

  test('CTA toast is dismissible', async ({ page }) => {
    // Trigger CTA toast
    const passBtn = page.getByRole('button', { name: /Marcar .+ éxito/ }).first();
    await passBtn.click();

    // Wait for toast to appear
    await expect(page.getByText('Crea una cuenta para registrar tu progreso')).toBeVisible();

    // Dismiss the toast
    const dismissBtn = page.getByRole('button', { name: 'Cerrar notificación' });
    await dismissBtn.click();

    // Toast should disappear (wait for exit animation)
    await expect(page.getByText('Crea una cuenta para registrar tu progreso')).not.toBeVisible({
      timeout: 3_000,
    });
  });
});

// ---------------------------------------------------------------------------
// 4.4 — Landing page links (REQ-LANDING-001, REQ-LANDING-002)
// ---------------------------------------------------------------------------

test.describe('Program preview — landing page links', () => {
  test('catalog cards have links to /programs/:id', async ({ page }) => {
    await page.goto('/');

    // Wait for catalog to load
    await expect(page.getByText('GZCLP')).toBeVisible({ timeout: 10_000 });

    // Find the GZCLP card link — it should point to /programs/gzclp
    const gzclpLink = page
      .locator('a[href="/programs/gzclp"]')
      .filter({ has: page.getByText('GZCLP') })
      .first();
    await expect(gzclpLink).toBeVisible();
  });

  test('clicking a catalog card navigates to the preview page', async ({ page }) => {
    await page.goto('/');

    // Wait for catalog to load
    await expect(page.getByText('GZCLP')).toBeVisible({ timeout: 10_000 });

    // Click the GZCLP card link
    const gzclpLink = page
      .locator('a[href="/programs/gzclp"]')
      .filter({ has: page.getByText('GZCLP') })
      .first();
    await gzclpLink.click();

    // Should navigate to the preview page
    await expect(page).toHaveURL(/\/programs\/gzclp/);

    // Preview page should render the program
    await expect(page.getByText('Día 1')).toBeVisible({ timeout: 10_000 });
  });
});
