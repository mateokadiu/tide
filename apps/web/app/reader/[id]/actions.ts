'use server';

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'node:crypto';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { highlights } from '@/db/schema/highlights';
import { requireUser } from '@/lib/auth/session';
import { ok, err, type Result } from '@/lib/types/result';

const HighlightInput = z.object({
  articleId: z.string().uuid(),
  text: z.string().min(2).max(4_000),
  color: z.enum(['cyan', 'yellow', 'green', 'blue', 'pink']).default('cyan'),
  note: z.string().max(1_000).optional(),
  startContainer: z.string(),
  endContainer: z.string(),
  startOffset: z.string(),
  endOffset: z.string(),
});

export async function createHighlight(input: z.infer<typeof HighlightInput>) {
  const parsed = HighlightInput.parse(input);
  const user = await requireUser();
  const [row] = await db()
    .insert(highlights)
    .values({
      userId: user.id,
      articleId: parsed.articleId,
      text: parsed.text,
      color: parsed.color,
      ...(parsed.note ? { note: parsed.note } : {}),
      startContainer: parsed.startContainer,
      endContainer: parsed.endContainer,
      startOffset: parsed.startOffset,
      endOffset: parsed.endOffset,
    })
    .returning({ id: highlights.id });
  revalidatePath(`/reader/${parsed.articleId}`);
  return row;
}

export async function updateProgress(articleId: string, progress: number): Promise<void> {
  if (progress < 0 || progress > 1 || !Number.isFinite(progress)) return;
  const user = await requireUser();
  await db()
    .update(articles)
    .set({
      progress,
      lastReadAt: new Date(),
      ...(progress >= 0.98 ? { isRead: true } : {}),
    })
    .where(and(eq(articles.id, articleId), eq(articles.userId, user.id)));
}

export async function archiveArticle(articleId: string, next: boolean) {
  const user = await requireUser();
  await db()
    .update(articles)
    .set({ isArchived: next, isRead: next ? true : undefined })
    .where(and(eq(articles.id, articleId), eq(articles.userId, user.id)));
  revalidatePath('/library');
}

export async function starArticle(articleId: string, next: boolean) {
  const user = await requireUser();
  await db()
    .update(articles)
    .set({ isStarred: next })
    .where(and(eq(articles.id, articleId), eq(articles.userId, user.id)));
  revalidatePath('/library');
}

export async function markRead(articleId: string, next: boolean) {
  const user = await requireUser();
  await db()
    .update(articles)
    .set({ isRead: next })
    .where(and(eq(articles.id, articleId), eq(articles.userId, user.id)));
  revalidatePath('/library');
}

export async function togglePublic(
  articleId: string,
): Promise<Result<{ isPublic: boolean; slug: string | null }>> {
  const user = await requireUser();
  const [current] = await db()
    .select({ isPublic: articles.isPublic, publicSlug: articles.publicSlug })
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.userId, user.id)))
    .limit(1);
  if (!current) return err('not_found', 'article not found');

  const nextIsPublic = !current.isPublic;
  const slug = nextIsPublic ? current.publicSlug ?? randomBytes(8).toString('base64url') : current.publicSlug;

  await db()
    .update(articles)
    .set({ isPublic: nextIsPublic, publicSlug: slug })
    .where(eq(articles.id, articleId));
  revalidatePath(`/reader/${articleId}`);
  return ok({ isPublic: nextIsPublic, slug: nextIsPublic ? slug : null });
}
