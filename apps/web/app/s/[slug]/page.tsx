import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article] = await db()
    .select({ title: articles.title, excerpt: articles.excerpt })
    .from(articles)
    .where(and(eq(articles.publicSlug, slug), eq(articles.isPublic, true)))
    .limit(1);
  if (!article) return { title: 'not found' };
  return {
    title: article.title,
    description: article.excerpt ?? undefined,
  };
}

export default async function PublicArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article] = await db()
    .select({
      title: articles.title,
      byline: articles.byline,
      siteName: articles.siteName,
      url: articles.url,
      readingMinutes: articles.readingMinutes,
      contentHtml: articles.contentHtml,
      excerpt: articles.excerpt,
      createdAt: articles.createdAt,
    })
    .from(articles)
    .where(and(eq(articles.publicSlug, slug), eq(articles.isPublic, true)))
    .limit(1);

  if (!article || !article.contentHtml) notFound();

  return (
    <main className="min-h-screen">
      <nav className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-mono text-sm tracking-tight">
            ~/tide
          </Link>
          <span className="text-xs text-muted-foreground font-mono">shared via tide</span>
        </div>
      </nav>

      <article className="reader-prose px-6 pt-12 pb-32">
        <h1 className="mb-2 text-3xl font-mono tracking-tight">{article.title}</h1>
        {article.byline ? (
          <p className="text-sm text-muted-foreground mb-1">{article.byline}</p>
        ) : null}
        <p className="text-xs text-muted-foreground font-mono mb-10">
          {article.siteName ?? new URL(article.url).hostname} ·{' '}
          {article.readingMinutes ?? 0} min ·{' '}
          <Link href={article.url} target="_blank" className="hover:underline underline-offset-4">
            view original
          </Link>
        </p>
        <div
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitised at extract time
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />
      </article>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-6 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <Link href="/" className="hover:text-foreground">
            try tide ↗
          </Link>
          <span>self-hostable read-later · MIT</span>
        </div>
      </footer>
    </main>
  );
}
