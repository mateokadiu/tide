'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { requireUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { streamSummary } from '@/lib/ai/summary';
import { publishNotification } from '@/lib/jobs/queue';

/**
 * Streaming summary on demand. Returns a ReadableStream of text chunks
 * that the client decodes and renders.
 */
export async function generateSummary(articleId: string): Promise<ReadableStream<Uint8Array>> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  const user = await requireUser();

  const [article] = await db()
    .select({
      title: articles.title,
      byline: articles.byline,
      text: articles.contentText,
      summary: articles.summary,
    })
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.userId, user.id)))
    .limit(1);
  if (!article || !article.text) throw new Error('article not found or not extracted');
  const articleText = article.text;

  const encoder = new TextEncoder();
  const collected: string[] = [];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamSummary({
          title: article.title,
          byline: article.byline,
          text: articleText,
        })) {
          collected.push(chunk);
          controller.enqueue(encoder.encode(chunk));
        }
        const summary = collected.join('').trim();
        await db()
          .update(articles)
          .set({ summary, summaryGeneratedAt: new Date() })
          .where(and(eq(articles.id, articleId), eq(articles.userId, user.id)));
        await publishNotification(user.id, {
          kind: 'summary.ready',
          articleId,
        });
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
