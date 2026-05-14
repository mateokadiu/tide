import { ImageResponse } from 'next/og';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';

export const alt = 'tide — shared article';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: { slug: string } }) {
  const [article] = await db()
    .select({
      title: articles.title,
      byline: articles.byline,
      siteName: articles.siteName,
      readingMinutes: articles.readingMinutes,
    })
    .from(articles)
    .where(and(eq(articles.publicSlug, params.slug), eq(articles.isPublic, true)))
    .limit(1);

  const title = article?.title ?? 'tide';
  const byline = article?.byline ?? '';
  const site = article?.siteName ?? 'tide.example';
  const mins = article?.readingMinutes ?? 0;

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#0c1117',
        color: '#e9ecf0',
        padding: 80,
        fontFamily: 'system-ui',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 28, color: '#37c6c2' }}>~/tide</span>
        <span style={{ fontFamily: 'monospace', fontSize: 18, color: '#6c7780' }}>
          shared library
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>
          {title.length > 110 ? `${title.slice(0, 110)}…` : title}
        </h1>
        {byline ? (
          <p style={{ fontSize: 24, color: '#a3acb4', margin: 0 }}>{byline}</p>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'monospace',
          fontSize: 20,
          color: '#6c7780',
        }}
      >
        <span>{site}</span>
        <span>{mins} min read · self-hosted</span>
      </div>
    </div>,
    { ...size },
  );
}
