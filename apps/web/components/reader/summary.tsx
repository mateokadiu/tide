import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { env } from '@/lib/env';
import { SummaryButton } from './summary-button';

/**
 * Server component. Renders the cached summary if one exists; otherwise renders
 * an "ask for a summary" button that calls the streaming server action. The
 * Anthropic call only fires on user intent, per
 * [PLAN.md row 14](../../../PLAN.md).
 */
export async function ReaderSummary({ articleId }: { articleId: string }) {
  const [article] = await db()
    .select({ summary: articles.summary })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) return null;

  if (article.summary) {
    return (
      <section>
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
          summary
        </h3>
        <p className="text-base leading-relaxed">{article.summary}</p>
      </section>
    );
  }

  if (!env.ANTHROPIC_API_KEY) {
    return (
      <section>
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
          summary
        </h3>
        <p className="text-sm text-muted-foreground">
          summary unavailable — <code className="font-mono">ANTHROPIC_API_KEY</code> not configured.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
        summary
      </h3>
      <SummaryButton articleId={articleId} />
    </section>
  );
}
