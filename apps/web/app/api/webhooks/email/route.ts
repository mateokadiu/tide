import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { users } from '@/db/schema/users';
import { env } from '@/lib/env';
import { canonicalizeUrl, urlHash } from '@/lib/extract/url-hash';
import { queues } from '@/lib/jobs/queue';

/**
 * Resend inbound email webhook.
 *
 * Resend posts a JSON payload to this endpoint when a message lands at
 * `save+{slug}@{EMAIL_INBOUND_DOMAIN}`. We:
 *   1. Verify the HMAC signature (header `resend-signature`).
 *   2. Extract the slug from the To: address → look up user.
 *   3. Extract a URL from the subject or body → insert + enqueue extract.
 *
 * Per RFC 5233, the local part `save+slug` is a subaddressed extension; mailers
 * deliver to `save@`, but Resend keeps the full thing in `to`.
 */

const InboundSchema = z.object({
  from: z.string().email().optional(),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
});

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!env.RESEND_INBOUND_WEBHOOK_SECRET) {
    // Dev mode: skip verification if the secret isn't configured.
    return !env.isProd;
  }
  if (!signature) return false;
  const computed = createHmac('sha256', env.RESEND_INBOUND_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

function extractUrl(...sources: (string | undefined)[]): string | null {
  // Permissive URL regex — first http(s) URL wins.
  for (const s of sources) {
    if (!s) continue;
    const m = s.match(/https?:\/\/[^\s<>"'()]+/);
    if (m) return m[0].replace(/[.,;:!?)]+$/, '');
  }
  return null;
}

function extractSlug(to: string | string[]): string | null {
  const list = Array.isArray(to) ? to : [to];
  for (const addr of list) {
    const m = addr.match(/save\+([a-z0-9-]+)@/i);
    if (m?.[1]) return m[1].toLowerCase();
  }
  return null;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get('resend-signature') ?? req.headers.get('x-resend-signature');
  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = InboundSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const slug = extractSlug(parsed.data.to);
  if (!slug) return NextResponse.json({ error: 'missing inbound slug' }, { status: 400 });

  const [user] = await db()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.inboundSlug, slug))
    .limit(1);
  if (!user) {
    return NextResponse.json({ error: 'unknown mailbox' }, { status: 404 });
  }

  const url = extractUrl(parsed.data.subject, parsed.data.text, parsed.data.html);
  if (!url) {
    return NextResponse.json({ error: 'no url found in message' }, { status: 422 });
  }

  const canonical = canonicalizeUrl(url);
  const hash = urlHash(canonical);

  const existing = await db()
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.userId, user.id), eq(articles.urlHash, hash)))
    .limit(1);

  if (existing[0]) {
    await db()
      .update(articles)
      .set({ updatedAt: new Date(), isArchived: false })
      .where(eq(articles.id, existing[0].id));
    return NextResponse.json({ ok: true, id: existing[0].id, deduplicated: true });
  }

  let host = 'web';
  try {
    host = new URL(canonical).hostname;
  } catch {
    // canonical is invariant by construction
  }

  const [row] = await db()
    .insert(articles)
    .values({
      userId: user.id,
      url,
      canonicalUrl: canonical,
      urlHash: hash,
      title: parsed.data.subject?.trim() || host,
      state: 'pending',
      source: 'email',
    })
    .returning({ id: articles.id });

  if (!row) return NextResponse.json({ error: 'insert failed' }, { status: 500 });

  await queues.extract.add(
    'extract',
    { articleId: row.id, userId: user.id, url: canonical, source: 'email' },
    { attempts: 3, backoff: { type: 'exponential', delay: 4_000 } },
  );

  return NextResponse.json({ ok: true, id: row.id, deduplicated: false }, { status: 201 });
}
