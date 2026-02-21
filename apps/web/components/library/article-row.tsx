import Link from 'next/link';
import type { Article } from '@/db/schema/articles';

type Row = Pick<
  Article,
  | 'id'
  | 'title'
  | 'byline'
  | 'siteName'
  | 'excerpt'
  | 'readingMinutes'
  | 'leadImageUrl'
  | 'isRead'
  | 'isStarred'
  | 'isArchived'
  | 'state'
  | 'url'
  | 'createdAt'
  | 'progress'
>;

export function ArticleRow({ row }: { row: Row }) {
  const isPending = row.state === 'pending' || row.state === 'extracting';
  const isFailed = row.state === 'failed';

  return (
    <Link
      href={`/reader/${row.id}`}
      className="flex gap-4 px-4 py-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-base leading-snug line-clamp-2">
          {row.title}
        </h3>
        <div className="flex items-center gap-3 mt-1 text-xs font-mono text-muted-foreground">
          {row.siteName ? <span className="truncate max-w-[16ch]">{row.siteName}</span> : null}
          {row.byline ? <span className="truncate max-w-[16ch]">· {row.byline}</span> : null}
          {row.readingMinutes ? <span>· {row.readingMinutes} min</span> : null}
          {isPending ? <span className="text-primary">· extracting…</span> : null}
          {isFailed ? <span className="text-destructive">· failed</span> : null}
          {row.isRead ? <span className="text-muted-foreground">· read</span> : null}
          {row.isStarred ? <span className="text-yellow-500">★</span> : null}
        </div>
        {row.excerpt ? (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 max-w-prose">
            {row.excerpt}
          </p>
        ) : null}
        {row.progress > 0.02 && row.progress < 0.98 ? (
          <div className="mt-3 h-0.5 w-32 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${row.progress * 100}%` }} />
          </div>
        ) : null}
      </div>

      {row.leadImageUrl ? (
        <div className="hidden sm:block w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.leadImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
    </Link>
  );
}
