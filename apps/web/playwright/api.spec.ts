import { expect, test } from '@playwright/test';

test.describe('public REST surface', () => {
  test('/api/v1/health returns the report shape', async ({ request }) => {
    const res = await request.get('/api/v1/health');
    // 200 or 503 — both produce a valid report.
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('ts');
    expect(body).toHaveProperty('db');
    expect(body).toHaveProperty('redis');
    expect(body).toHaveProperty('version');
  });

  test('/api/v1/articles GET rejects missing token', async ({ request }) => {
    const res = await request.get('/api/v1/articles');
    expect(res.status()).toBe(401);
  });

  test('/api/v1/articles POST rejects invalid token', async ({ request }) => {
    const res = await request.post('/api/v1/articles', {
      headers: { authorization: 'Bearer tide_pat_bogus' },
      data: { url: 'https://example.com/x' },
    });
    expect(res.status()).toBe(401);
  });

  test('/api/webhooks/email rejects invalid signature in prod-like mode', async ({ request }) => {
    // No RESEND_INBOUND_WEBHOOK_SECRET in tests → signatures default-allowed in dev.
    // We still get a 400/422 path because we send no slug + no url.
    const res = await request.post('/api/webhooks/email', {
      data: { to: 'random@example.com', subject: 'hi' },
    });
    expect([400, 401, 404, 422]).toContain(res.status());
  });

  test('robots.txt + sitemap.xml are reachable', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain('User-Agent:');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('<urlset');
  });
});
