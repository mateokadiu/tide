import Link from 'next/link';
import { Suspense } from 'react';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { requireUser } from '@/lib/auth/session';
import { LibraryFilters } from '@/components/library/filters';
import { ArticleRow } from '@/components/library/article-row';
import { SaveForm } from '@/components/save-form';

export const metadata = { title: 'library' };

type Filter = 'inbox' | 'archived' | 'highlighted' | 'starred';

function parseFilter(v: string | undefined): Filter {
  if (v === 'archived' || v === 'highlighted' || v === 'starred') return v;
  return 'inbox';
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter = parseFilter(sp.filter);

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-mono text-2xl tracking-tight">library</h1>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-mono">{user.email}</span> · self-hosted
          </p>
        </div>
        <SaveForm />
      </div>

      <LibraryFilters active={filter} />

      <Suspense fallback={<RowsSkeleton />}>
        <Rows userId={user.id} filter={filter} q={sp.q ?? ''} />
      </Suspense>
    </main>
  );
}

async function Rows({ userId, filter, q }: { userId: string; filter: Filter; q: string }) {
  const conditions = [eq(articles.userId, userId)];
  if (filter === 'inbox') conditions.push(eq(articles.isArchived, false));
  if (filter === 'archived') conditions.push(eq(articles.isArchived, true));
  if (filter === 'starred') conditions.push(eq(articles.isStarred, true));

  const rows = await db()
    .select({
      id: articles.id,
      title: articles.title,
      byline: articles.byline,
      siteName: articles.siteName,
      excerpt: articles.excerpt,
      readingMinutes: articles.readingMinutes,
      leadImageUrl: articles.leadImageUrl,
      isRead: articles.isRead,
      isStarred: articles.isStarred,
      isArchived: articles.isArchived,
      state: articles.state,
      url: articles.url,
      createdAt: articles.createdAt,
      progress: articles.progress,
    })
    .from(articles)
    .where(and(...conditions))
    .orderBy(desc(articles.createdAt))
    .limit(60);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="font-mono text-sm text-muted-foreground">nothing here yet.</p>
        <p className="text-xs text-muted-foreground mt-2">
          paste a url above, or install the{' '}
          <Link href="/settings/extensions" className="underline underline-offset-4">
            browser extension
          </Link>
          .
        </p>
      </div>
    );
  }

  const filtered = q
    ? rows.filter((r) => `${r.title} ${r.byline ?? ''} ${r.siteName ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    : rows;

  return (
    <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-card">
      {filtered.map((row) => (
        <li key={row.id}>
          <ArticleRow row={row} />
        </li>
      ))}
    </ul>
  );
}

const SKELETON_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5'] as const;

function RowsSkeleton() {
  return (
    <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-card">
      {SKELETON_KEYS.map((k) => (
        <li key={k} className="h-20 animate-pulse bg-muted/30" />
      ))}
    </ul>
  );
}
