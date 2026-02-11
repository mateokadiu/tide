import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { articleTags, tags } from '@/db/schema/tags';
import { inferTags } from '@/lib/ai/tag';
import type { TagJob } from '../queue';

export async function runTagJob(job: TagJob): Promise<void> {
  const [a] = await db()
    .select({ title: articles.title, excerpt: articles.excerpt, text: articles.contentText })
    .from(articles)
    .where(eq(articles.id, job.articleId))
    .limit(1);
  if (!a) return;

  const inferred = await inferTags({
    title: a.title,
    excerpt: a.excerpt,
    text: a.text ?? '',
  });
  if (inferred.length === 0) return;

  for (const name of inferred.slice(0, 3)) {
    const existing = await db()
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.userId, job.userId), eq(tags.name, name)))
      .limit(1);

    const tagId =
      existing[0]?.id ??
      (
        await db()
          .insert(tags)
          .values({ userId: job.userId, name, source: 'ai' })
          .returning({ id: tags.id })
      )[0]!.id;

    await db()
      .insert(articleTags)
      .values({ articleId: job.articleId, tagId })
      .onConflictDoNothing();
  }
}
