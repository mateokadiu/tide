import { NextResponse, type NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { SaveArticleRequest } from '@tide/sdk';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { verifyApiToken } from '@/lib/auth/api-token';
import { canonicalizeUrl, urlHash } from '@/lib/extract/url-hash';
import { queues } from '@/lib/jobs/queue';
import { rlSavePerIp, rlSavePerUser } from '@/lib/rate-limit';

function bearerFrom(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  if (!h?.toLowerCase().startsWith('bearer ')) return null;
  return h.slice(7).trim();
}

export async function POST(req: NextRequest) {
  const token = bearerFrom(req);
  if (!token) return NextResponse.json({ error: 'missing bearer token' }, { status: 401 });

  const verified = await verifyApiToken(token, 'articles:write');
  if (!verified) return NextResponse.json({ error: 'invalid token' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const [ipRl, userRl] = await Promise.all([
    rlSavePerIp().limit(ip),
    rlSavePerUser().limit(verified.userId),
  ]);
  if (!ipRl.success || !userRl.success) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const parsed = SaveArticleRequest.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const canonical = canonicalizeUrl(parsed.data.url);
  const hash = urlHash(canonical);

  const existing = await db()
    .select({ id: articles.id, state: articles.state, canonicalUrl: articles.canonicalUrl, createdAt: articles.createdAt })
    .from(articles)
    .where(and(eq(articles.userId, verified.userId), eq(articles.urlHash, hash)))
    .limit(1);

  if (existing[0]) {
    return NextResponse.json(
      {
        id: existing[0].id,
        url: parsed.data.url,
        canonicalUrl: existing[0].canonicalUrl,
        state: existing[0].state,
        createdAt: existing[0].createdAt.toISOString(),
        deduplicated: true,
      },
      { status: 200 },
    );
  }

  let host = 'web';
  try {
    host = new URL(canonical).hostname;
  } catch {
    // canonical is invariant URL by construction; fall through
  }

  const [row] = await db()
    .insert(articles)
    .values({
      userId: verified.userId,
      url: parsed.data.url,
      canonicalUrl: canonical,
      urlHash: hash,
      title: parsed.data.title ?? host,
      state: 'pending',
      source: 'api',
      isStarred: parsed.data.starred ?? false,
      isArchived: parsed.data.archived ?? false,
    })
    .returning({ id: articles.id, createdAt: articles.createdAt });

  if (!row) return NextResponse.json({ error: 'insert failed' }, { status: 500 });

  await queues.extract.add(
    'extract',
    { articleId: row.id, userId: verified.userId, url: canonical, source: 'api' },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 4_000 },
    },
  );

  return NextResponse.json(
    {
      id: row.id,
      url: parsed.data.url,
      canonicalUrl: canonical,
      state: 'pending',
      createdAt: row.createdAt.toISOString(),
      deduplicated: false,
    },
    { status: 201 },
  );
}

