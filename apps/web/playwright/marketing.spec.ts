import { expect, test } from '@playwright/test';

test.describe('marketing surface', () => {
  test('renders the hero and pricing block', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('save anything');
    await expect(page.getByText('capture surfaces')).toBeVisible();
    await expect(page.getByRole('link', { name: /github/i }).first()).toBeVisible();
  });

  test('login link routes to /login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'login' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  });

  test('public share route 404s on a missing slug', async ({ page }) => {
    const res = await page.goto('/s/does-not-exist-9999');
    expect(res?.status()).toBe(404);
  });
});
