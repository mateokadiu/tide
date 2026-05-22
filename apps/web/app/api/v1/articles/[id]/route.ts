import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { verifyApiToken } from '@/lib/auth/api-token';

function bearerFrom(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  if (!h?.toLowerCase().startsWith('bearer ')) return null;
  return h.slice(7).trim();
}

const PatchSchema = z.object({
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = bearerFrom(req);
  if (!token) return NextResponse.json({ error: 'missing bearer token' }, { status: 401 });
  const verified = await verifyApiToken(token, 'articles:read');
  if (!verified) return NextResponse.json({ error: 'invalid token' }, { status: 401 });

  const { id } = await ctx.params;
  const [article] = await db()
    .select({
      id: articles.id,
      url: articles.url,
      canonicalUrl: articles.canonicalUrl,
      title: articles.title,
      byline: articles.byline,
      siteName: articles.siteName,
      excerpt: articles.excerpt,
      contentHtml: articles.contentHtml,
      state: articles.state,
      isRead: articles.isRead,
      isStarred: articles.isStarred,
      isArchived: articles.isArchived,
      readingMinutes: articles.readingMinutes,
      summary: articles.summary,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(and(eq(articles.id, id), eq(articles.userId, verified.userId)))
    .limit(1);

  if (!article) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    ...article,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = bearerFrom(req);
  if (!token) return NextResponse.json({ error: 'missing bearer token' }, { status: 401 });
  const verified = await verifyApiToken(token, 'articles:write');
  if (!verified) return NextResponse.json({ error: 'invalid token' }, { status: 401 });

  const { id } = await ctx.params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const patch: {
    isRead?: boolean;
    isStarred?: boolean;
    isArchived?: boolean;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (typeof parsed.data.isRead === 'boolean') patch.isRead = parsed.data.isRead;
  if (typeof parsed.data.isStarred === 'boolean') patch.isStarred = parsed.data.isStarred;
  if (typeof parsed.data.isArchived === 'boolean') patch.isArchived = parsed.data.isArchived;
  if (Object.keys(patch).length === 1) return NextResponse.json({ ok: true });

  await db()
    .update(articles)
    .set(patch)
    .where(and(eq(articles.id, id), eq(articles.userId, verified.userId)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = bearerFrom(req);
  if (!token) return NextResponse.json({ error: 'missing bearer token' }, { status: 401 });
  const verified = await verifyApiToken(token, 'articles:write');
  if (!verified) return NextResponse.json({ error: 'invalid token' }, { status: 401 });

  const { id } = await ctx.params;
  const out = await db()
    .delete(articles)
    .where(and(eq(articles.id, id), eq(articles.userId, verified.userId)))
    .returning({ id: articles.id });
  if (out.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, deleted: out[0]?.id });
}
