import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { env } from '@/lib/env';
import { summarize } from '@/lib/ai/summary';

/**
 * Server component that streams the summary into the Suspense boundary.
 * The summary is cached on the article row once generated.
 */
export async function ReaderSummary({ articleId }: { articleId: string }) {
  const [article] = await db()
    .select({
      title: articles.title,
      byline: articles.byline,
      summary: articles.summary,
      text: articles.contentText,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article || !article.text) return null;

  let summary = article.summary;
  if (!summary && env.ANTHROPIC_API_KEY) {
    try {
      summary = await summarize({
        title: article.title,
        byline: article.byline,
        text: article.text,
      });
      await db()
        .update(articles)
        .set({ summary, summaryGeneratedAt: new Date() })
        .where(eq(articles.id, articleId));
    } catch (err) {
      console.warn('[summary] generation failed', err);
    }
  }

  if (!summary) {
    return (
      <section>
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
          summary
        </h3>
        <p className="text-sm text-muted-foreground">
          summary unavailable — anthropic key not configured.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
        summary
      </h3>
      <p className="text-base leading-relaxed">{summary}</p>
    </section>
  );
}
