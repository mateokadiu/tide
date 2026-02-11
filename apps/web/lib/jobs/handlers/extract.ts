import 'server-only';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { notifications } from '@/db/schema/notifications';
import { fetchPage } from '@/lib/extract/fetch';
import { extractArticle, ExtractError } from '@/lib/extract';
import { sanitizeHtml } from '@/lib/extract/sanitize';
import { queues, type ExtractJob } from '../queue';

export async function runExtractJob(job: ExtractJob): Promise<void> {
  const start = Date.now();
  await db()
    .update(articles)
    .set({ state: 'extracting' })
    .where(and(eq(articles.id, job.articleId), eq(articles.userId, job.userId)));

  try {
    const page = await fetchPage(job.url);
    if (page.status >= 400) {
      throw new ExtractError(`fetch failed: HTTP ${page.status}`, 'unknown');
    }

    const extracted = extractArticle({ url: job.url, html: page.html });
    const sanitized = sanitizeHtml(extracted.contentHtml);

    await db()
      .update(articles)
      .set({
        title: extracted.title,
        byline: extracted.byline,
        siteName: extracted.siteName,
        lang: extracted.lang,
        excerpt: extracted.excerpt,
        leadImageUrl: extracted.leadImageUrl,
        contentHtml: sanitized,
        contentText: extracted.contentText,
        wordCount: extracted.wordCount,
        readingMinutes: extracted.readingMinutes,
        canonicalUrl: extracted.canonicalUrl,
        state: 'ready',
        failureReason: null,
      })
      .where(eq(articles.id, job.articleId));

    // Fan out follow-up jobs.
    await Promise.all([
      queues.embed.add('embed', { articleId: job.articleId, userId: job.userId }, { delay: 250 }),
      queues.tag.add('tag', { articleId: job.articleId, userId: job.userId }, { delay: 500 }),
      queues.archiveHtml.add(
        'archive-html',
        { articleId: job.articleId, userId: job.userId, url: job.url, html: page.html },
        { delay: 1000 },
      ),
    ]);

    await db().insert(notifications).values({
      userId: job.userId,
      kind: 'extract.ok',
      payload: JSON.stringify({ articleId: job.articleId, ms: Date.now() - start }),
    });
  } catch (err) {
    const code = err instanceof ExtractError ? err.code : 'unknown';
    const message = err instanceof Error ? err.message : String(err);
    await db()
      .update(articles)
      .set({ state: 'failed', failureReason: `${code}: ${message}` })
      .where(eq(articles.id, job.articleId));
    await db().insert(notifications).values({
      userId: job.userId,
      kind: 'extract.failed',
      payload: JSON.stringify({ articleId: job.articleId, code, message }),
    });
    throw err;
  }
}
