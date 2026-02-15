'use server';

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { requireUser } from '@/lib/auth/session';
import { canonicalizeUrl, urlHash } from '@/lib/extract/url-hash';
import { queues } from '@/lib/jobs/queue';
import { rlSavePerIp, rlSavePerUser } from '@/lib/rate-limit';
import { err, ok, type Result } from '@/lib/types/result';
import type { ArticleSource } from '@/db/schema/articles';

const SaveInput = z.object({
  url: z.string().url(),
  source: z
    .enum(['web', 'extension', 'pwa', 'email', 'api'])
    .default('web')
    .optional(),
});

export interface SaveResult {
  id: string;
  url: string;
  canonicalUrl: string;
  deduplicated: boolean;
  state: 'pending' | 'extracting' | 'ready' | 'failed';
}

export async function saveArticle(rawInput: unknown): Promise<Result<SaveResult>> {
  const parsed = SaveInput.safeParse(rawInput);
  if (!parsed.success) {
    return err('invalid_input', 'invalid url', { issues: parsed.error.flatten().fieldErrors });
  }

  const user = await requireUser();
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const [ipRl, userRl] = await Promise.all([
    rlSavePerIp().limit(ip),
    rlSavePerUser().limit(user.id),
  ]);
  if (!ipRl.success || !userRl.success) {
    return err('rate_limited', 'save rate limit exceeded; try again later');
  }

  const canonical = canonicalizeUrl(parsed.data.url);
  const hash = urlHash(canonical);

  // Dedupe: (user_id, url_hash) is unique. Return the existing row and bump
  // its updated_at so it climbs the library.
  const existing = await db()
    .select({ id: articles.id, url: articles.url, canonicalUrl: articles.canonicalUrl, state: articles.state })
    .from(articles)
    .where(and(eq(articles.userId, user.id), eq(articles.urlHash, hash)))
    .limit(1);

  if (existing[0]) {
    await db()
      .update(articles)
      .set({ updatedAt: new Date(), isArchived: false })
      .where(eq(articles.id, existing[0].id));
    revalidatePath('/library');
    return ok({
      id: existing[0].id,
      url: existing[0].url,
      canonicalUrl: existing[0].canonicalUrl,
      deduplicated: true,
      state: existing[0].state,
    });
  }

  const source: ArticleSource = parsed.data.source ?? 'web';

  // Optimistic insert with a placeholder title — the extract job fills it in.
  let host = 'web';
  try {
    host = new URL(canonical).hostname;
  } catch {
    // canonical is invariant URL by construction; fall through
  }

  const [row] = await db()
    .insert(articles)
    .values({
      userId: user.id,
      url: parsed.data.url,
      canonicalUrl: canonical,
      urlHash: hash,
      title: host,
      state: 'pending',
      source,
    })
    .returning({ id: articles.id });

  if (!row) return err('unknown', 'failed to insert article');

  // Fire the extract job — handler is responsible for fan-out to embed/tag/archive.
  await queues.extract.add(
    'extract',
    { articleId: row.id, userId: user.id, url: canonical, source },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 4_000 },
      removeOnComplete: 500,
      removeOnFail: 200,
    },
  );

  revalidatePath('/library');
  return ok({
    id: row.id,
    url: parsed.data.url,
    canonicalUrl: canonical,
    deduplicated: false,
    state: 'pending',
  });
}
