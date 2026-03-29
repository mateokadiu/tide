import Link from 'next/link';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/session';
import { searchArticles, type SearchMode } from '@/lib/search';
import { SearchForm } from '@/components/search/search-form';

export const metadata = { title: 'search' };

function parseMode(v: string | undefined): SearchMode {
  if (v === 'fts' || v === 'semantic') return v;
  return 'auto';
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const mode = parseMode(sp.mode);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="font-mono text-2xl tracking-tight">search</h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          fts · trigram · semantic
        </p>
      </header>

      <SearchForm initialQuery={q} initialMode={mode} />

      {q ? (
        <Suspense fallback={<p className="text-xs text-muted-foreground font-mono">searching…</p>}>
          <Results userId={user.id} q={q} mode={mode} />
        </Suspense>
      ) : (
        <p className="text-sm text-muted-foreground font-mono">
          type to search. queries with 4+ words use hybrid fts + semantic.
        </p>
      )}
    </main>
  );
}

async function Results({ userId, q, mode }: { userId: string; q: string; mode: SearchMode }) {
  const hits = await searchArticles({ userId, q, mode, limit: 30 });
  if (hits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground font-mono">no matches for &quot;{q}&quot;.</p>
    );
  }
  return (
    <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-card">
      {hits.map((hit) => (
        <li key={hit.id} className="p-4 hover:bg-muted/30 transition-colors">
          <Link href={`/reader/${hit.id}`} className="block space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-sm tracking-tight">{hit.title}</span>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                {hit.match} · {hit.rank.toFixed(2)}
              </span>
            </div>
            {hit.excerpt ? (
              <p className="text-xs text-muted-foreground line-clamp-2">{hit.excerpt}</p>
            ) : null}
            <p className="text-[10px] text-muted-foreground font-mono">
              {hit.siteName ?? '—'}
              {hit.readingMinutes ? ` · ${hit.readingMinutes} min` : ''}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
