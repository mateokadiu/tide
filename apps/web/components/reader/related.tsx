import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { db, supportsVector } from '@/db/client';
import { articles } from '@/db/schema/articles';

export async function ReaderRelated({ articleId }: { articleId: string }) {
  if (!supportsVector()) return null;

  const [base] = await db()
    .select({ userId: articles.userId, embedding: articles.embedding })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!base || !base.embedding) return null;

  const literal = `[${(base.embedding as unknown as number[]).join(',')}]`;

  const rows = await db()
    .execute(
      sql`
        SELECT id, title, site_name as "siteName", reading_minutes as "readingMinutes"
        FROM articles
        WHERE user_id = ${base.userId}::uuid
          AND id <> ${articleId}::uuid
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${literal}::vector
        LIMIT 5
      `,
    )
    .catch(() => [] as unknown[]);

  const items = rows as unknown as Array<{
    id: string;
    title: string;
    siteName: string | null;
    readingMinutes: number | null;
  }>;
  if (!items.length) return null;

  return (
    <section>
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
        related
      </h3>
      <ul className="space-y-2 text-sm">
        {items.map((it) => (
          <li key={it.id}>
            <Link href={`/reader/${it.id}`} className="hover:text-primary">
              {it.title}
            </Link>
            {it.siteName ? (
              <span className="text-muted-foreground font-mono text-xs ml-2">
                · {it.siteName}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
