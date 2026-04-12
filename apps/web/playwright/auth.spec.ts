import { expect, test } from '@playwright/test';

test.describe('auth gates', () => {
  test('/library redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/library');
    await expect(page).toHaveURL(/\/login(\?next=.+)?$/);
  });

  test('/settings redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login(\?next=.+)?$/);
  });

  test('/search redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/login(\?next=.+)?$/);
  });

  test('/api/v1/articles rejects requests without a bearer', async ({ request }) => {
    const res = await request.post('/api/v1/articles', {
      data: { url: 'https://example.com/x' },
    });
    expect(res.status()).toBe(401);
  });
});
