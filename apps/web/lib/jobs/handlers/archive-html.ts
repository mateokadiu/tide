import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { archiveKeyFor, storage } from '@/lib/storage';
import type { ArchiveHtmlJob } from '../queue';

export async function runArchiveHtmlJob(job: ArchiveHtmlJob): Promise<void> {
  const key = archiveKeyFor(job.userId, job.articleId);
  await storage().put(key, job.html, 'text/html; charset=utf-8');
  await db().update(articles).set({ archiveKey: key }).where(eq(articles.id, job.articleId));
}
