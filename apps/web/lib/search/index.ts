import 'server-only';
import { sql } from 'drizzle-orm';
import { db, supportsFts, supportsVector } from '@/db/client';
import { embedQuery } from '@/lib/ai/embeddings';

export type SearchMode = 'fts' | 'semantic' | 'auto';

export interface SearchHit {
  id: string;
  title: string;
  excerpt: string | null;
  siteName: string | null;
  byline: string | null;
  readingMinutes: number | null;
  createdAt: Date;
  rank: number;
  match: 'fts' | 'semantic' | 'trigram';
}

interface DbHitRow {
  id: string;
  title: string;
  excerpt: string | null;
  site_name: string | null;
  byline: string | null;
  reading_minutes: number | null;
  created_at: string | Date;
  rank: number | string;
}

function row(r: DbHitRow, match: SearchHit['match']): SearchHit {
  return {
    id: r.id,
    title: r.title,
    excerpt: r.excerpt,
    siteName: r.site_name,
    byline: r.byline,
    readingMinutes: typeof r.reading_minutes === 'number' ? r.reading_minutes : null,
    createdAt: r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
    rank: typeof r.rank === 'number' ? r.rank : Number(r.rank),
    match,
  };
}

/**
 * Full-text search using the tsvector + trigram indexes.
 * Combines ts_rank_cd with a trigram similarity boost on title.
 */
async function ftsSearch(userId: string, q: string, limit: number): Promise<SearchHit[]> {
  if (!supportsFts()) {
    // SQLite fallback: LIKE on title + excerpt
    const rows = (await db().execute(
      sql`
        SELECT id, title, excerpt, site_name, byline, reading_minutes, created_at,
          CAST(0 AS REAL) AS rank
        FROM articles
        WHERE user_id = ${userId}
          AND (lower(title) LIKE ${`%${q.toLowerCase()}%`}
            OR lower(excerpt) LIKE ${`%${q.toLowerCase()}%`})
        ORDER BY created_at DESC
        LIMIT ${limit}
      `,
    )) as unknown as DbHitRow[];
    return rows.map((r) => row(r, 'fts'));
  }
  const rows = (await db().execute(
    sql`
      SELECT id, title, excerpt, site_name, byline, reading_minutes, created_at,
        ts_rank_cd(search_vector, websearch_to_tsquery('english', ${q})) +
          GREATEST(similarity(title, ${q}), 0) * 0.4 AS rank
      FROM articles
      WHERE user_id = ${userId}::uuid
        AND state = 'ready'
        AND (
          search_vector @@ websearch_to_tsquery('english', ${q})
          OR title % ${q}
        )
      ORDER BY rank DESC, created_at DESC
      LIMIT ${limit}
    `,
  )) as unknown as DbHitRow[];
  return rows.map((r) => row(r, 'fts'));
}

/**
 * Cosine ANN search using pgvector ivfflat.
 * Re-rank the top-N by inner product; bias toward recent.
 */
async function semanticSearch(
  userId: string,
  q: string,
  limit: number,
): Promise<SearchHit[]> {
  if (!supportsVector()) return [];
  const vec = await embedQuery(q);
  if (!vec) return [];
  const literal = `[${vec.join(',')}]`;

  const rows = (await db().execute(
    sql`
      SELECT id, title, excerpt, site_name, byline, reading_minutes, created_at,
        1 - (embedding <=> ${literal}::vector) AS rank
      FROM articles
      WHERE user_id = ${userId}::uuid
        AND state = 'ready'
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${literal}::vector
      LIMIT ${limit}
    `,
  )) as unknown as DbHitRow[];
  return rows.map((r) => row(r, 'semantic'));
}

/**
 * Hybrid search: FTS first, then top up with semantic. De-dupe on id.
 * Use mode='fts' or 'semantic' to force one side.
 */
export async function searchArticles(opts: {
  userId: string;
  q: string;
  mode?: SearchMode;
  limit?: number;
}): Promise<SearchHit[]> {
  const q = opts.q.trim();
  if (q.length === 0) return [];
  const limit = opts.limit ?? 30;
  const mode = opts.mode ?? 'auto';

  if (mode === 'fts') return ftsSearch(opts.userId, q, limit);
  if (mode === 'semantic') return semanticSearch(opts.userId, q, limit);

  // auto: short queries → FTS; longer (>= 4 words) → hybrid.
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length < 4) return ftsSearch(opts.userId, q, limit);

  const [fts, semantic] = await Promise.all([
    ftsSearch(opts.userId, q, limit),
    semanticSearch(opts.userId, q, limit),
  ]);
  const seen = new Set<string>();
  const merged: SearchHit[] = [];
  for (const hit of fts) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    merged.push(hit);
  }
  for (const hit of semantic) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    merged.push(hit);
  }
  return merged.slice(0, limit);
}
