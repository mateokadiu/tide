import 'server-only';
import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { users } from '@/db/schema/users';
import { sendDigestEmail } from '@/lib/email/digest';

export interface WeeklyDigestJob {
  userId: string;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function runWeeklyDigest(job: WeeklyDigestJob): Promise<void> {
  const since = new Date(Date.now() - ONE_WEEK_MS);

  const [user] = await db()
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, job.userId))
    .limit(1);
  if (!user) return;

  const recent = await db()
    .select({
      id: articles.id,
      title: articles.title,
      siteName: articles.siteName,
      excerpt: articles.excerpt,
      isRead: articles.isRead,
      createdAt: articles.createdAt,
      readingMinutes: articles.readingMinutes,
    })
    .from(articles)
    .where(and(eq(articles.userId, user.id), gt(articles.createdAt, since)))
    .orderBy(desc(articles.createdAt));

  const saved = recent.length;
  const read = recent.filter((r) => r.isRead).length;
  const unread = recent.filter((r) => !r.isRead);

  if (saved === 0) return;

  await sendDigestEmail({
    to: user.email,
    saved,
    read,
    unread: unread.slice(0, 8).map((u) => ({
      id: u.id,
      title: u.title,
      siteName: u.siteName,
      excerpt: u.excerpt,
      readingMinutes: u.readingMinutes,
    })),
  });
}
