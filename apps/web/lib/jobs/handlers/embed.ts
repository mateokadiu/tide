import 'server-only';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db, supportsVector } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { embedText } from '@/lib/ai/embeddings';
import type { EmbedJob } from '../queue';

export async function runEmbedJob(job: EmbedJob): Promise<void> {
  if (!supportsVector()) {
    // SQLite mode — semantic search is degraded; skip silently.
    return;
  }
  const [article] = await db()
    .select({ title: articles.title, excerpt: articles.excerpt, text: articles.contentText })
    .from(articles)
    .where(eq(articles.id, job.articleId))
    .limit(1);
  if (!article || !article.text) return;

  const payload = [article.title, article.excerpt ?? '', article.text]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 12_000);

  const vector = await embedText(payload);
  if (!vector) return;

  await db()
    .update(articles)
    .set({
      // pgvector custom type handles the string serialization
      embedding: vector,
    } as Partial<typeof articles.$inferInsert>)
    .where(eq(articles.id, job.articleId));

  // touch updated_at via the trigger
  await db()
    .execute(sql`UPDATE articles SET updated_at = now() WHERE id = ${job.articleId}::uuid`)
    .catch(() => {});
}
