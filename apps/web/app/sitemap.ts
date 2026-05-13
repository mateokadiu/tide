import type { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { env } from '@/lib/env';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/signup`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Public-share routes are the only user-owned URLs that should be indexed.
  try {
    const rows = await db()
      .select({
        slug: articles.publicSlug,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(eq(articles.isPublic, true))
      .limit(2_000);
    const shareRoutes: MetadataRoute.Sitemap = rows
      .filter((r): r is { slug: string; updatedAt: Date } => !!r.slug)
      .map((r) => ({
        url: `${base}/s/${r.slug}`,
        lastModified: r.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.6,
      }));
    return [...staticRoutes, ...shareRoutes];
  } catch {
    // DB unavailable at build time (e.g. CI without a connection) — just
    // return the static routes.
    return staticRoutes;
  }
}
