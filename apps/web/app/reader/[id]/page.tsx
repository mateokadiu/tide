import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { highlights as highlightsTable } from '@/db/schema/highlights';
import { requireUser } from '@/lib/auth/session';
import { ReaderActions } from '@/components/reader/actions';
import { ReaderBody } from '@/components/reader/body';
import { ReaderControls } from '@/components/reader/controls';
import { ReaderProgress } from '@/components/reader/progress';
import { ReaderSummary } from '@/components/reader/summary';
import { ReaderRelated } from '@/components/reader/related';
import { ListenButton } from '@/components/reader/listen';

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const [article] = await db()
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), eq(articles.userId, user.id)))
    .limit(1);

  if (!article) notFound();

  const userHighlights = await db()
    .select({
      id: highlightsTable.id,
      text: highlightsTable.text,
      color: highlightsTable.color,
      note: highlightsTable.note,
      startContainer: highlightsTable.startContainer,
      endContainer: highlightsTable.endContainer,
      startOffset: highlightsTable.startOffset,
      endOffset: highlightsTable.endOffset,
    })
    .from(highlightsTable)
    .where(and(eq(highlightsTable.articleId, id), eq(highlightsTable.userId, user.id)));

  return (
    <article className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/library" className="font-mono text-sm text-muted-foreground hover:text-foreground">
            ← library
          </Link>
          <div className="flex items-center gap-2">
            <ListenButton articleId={article.id} />
            <ReaderControls
              initial={{
                font: 'serif',
                size: 'md',
                width: 'medium',
                theme: 'dark',
                justified: false,
                bionic: false,
              }}
            />
            <ReaderActions
              articleId={article.id}
              isArchived={article.isArchived}
              isStarred={article.isStarred}
              isPublic={article.isPublic}
              publicSlug={article.publicSlug}
            />
          </div>
        </div>
      </header>

      <ReaderProgress articleId={article.id} initial={article.progress} />

      <div className="reader-prose px-6 pt-12 pb-32">
        <h1 className="mb-2 text-3xl font-mono tracking-tight">{article.title}</h1>
        {article.byline ? (
          <p className="text-sm text-muted-foreground mb-1">{article.byline}</p>
        ) : null}
        <p className="text-xs text-muted-foreground font-mono mb-10">
          {article.siteName ?? new URL(article.url).hostname} ·{' '}
          {article.readingMinutes ?? 0} min ·{' '}
          <Link href={article.url} target="_blank" className="underline-offset-4 hover:underline">
            view original
          </Link>
        </p>

        {article.state === 'ready' && article.contentHtml ? (
          <ReaderBody articleId={article.id} html={article.contentHtml} highlights={userHighlights} />
        ) : article.state === 'failed' ? (
          <p className="text-destructive font-mono text-sm">
            extraction failed: {article.failureReason ?? 'unknown'}
          </p>
        ) : (
          <p className="text-muted-foreground font-mono text-sm animate-pulse">extracting…</p>
        )}
      </div>

      {article.state === 'ready' ? (
        <footer className="border-t border-border bg-card">
          <div className="reader-prose px-6 py-12 space-y-12">
            <Suspense fallback={<SummarySkeleton />}>
              <ReaderSummary articleId={article.id} />
            </Suspense>
            <Suspense fallback={null}>
              <ReaderRelated articleId={article.id} />
            </Suspense>
          </div>
        </footer>
      ) : null}
    </article>
  );
}

function SummarySkeleton() {
  return (
    <section>
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">summary</h3>
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-11/12 bg-muted rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
      </div>
    </section>
  );
}
