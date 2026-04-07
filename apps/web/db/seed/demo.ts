// Seed a "demo" user with 30 curated articles so the empty state isn't empty.
// Idempotent — re-running upserts the same user + dedupes the saves.

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../client';
import { articles, type ArticleSource } from '../schema/articles';
import { users } from '../schema/users';
import { tags, articleTags } from '../schema/tags';
import { canonicalizeUrl, urlHash } from '../../lib/extract/url-hash';

interface Seed {
  url: string;
  title: string;
  byline: string | null;
  siteName: string;
  excerpt: string;
  readingMinutes: number;
  wordCount: number;
  tags: string[];
  isRead?: boolean;
  isStarred?: boolean;
}

// A mix of canonical reads — feel free to swap any of these out.
const CURATED: Seed[] = [
  {
    url: 'https://www.paulgraham.com/charisma.html',
    title: 'Charisma / Power',
    byline: 'Paul Graham',
    siteName: 'paulgraham.com',
    excerpt: 'I finally have a hypothesis about why so many politicians sound like idiots.',
    readingMinutes: 3,
    wordCount: 642,
    tags: ['essays', 'politics'],
    isStarred: true,
  },
  {
    url: 'https://danluu.com/cocktail-ideas/',
    title: 'Cocktail party ideas',
    byline: 'Dan Luu',
    siteName: 'danluu.com',
    excerpt: 'A grab-bag of slightly-baked thoughts that aren\'t worth a full post.',
    readingMinutes: 12,
    wordCount: 2_500,
    tags: ['essays'],
  },
  {
    url: 'https://www.bramcohen.com/blog/2026/01/distributed-cas',
    title: 'A primer on distributed content-addressable storage',
    byline: 'Bram Cohen',
    siteName: 'bramcohen.com',
    excerpt: 'CAS is the substrate of git, ipfs, and most modern object stores. It\'s also where most data-platform bugs live.',
    readingMinutes: 18,
    wordCount: 3_600,
    tags: ['systems', 'storage'],
  },
  {
    url: 'https://martin.kleppmann.com/2026/02/causality.html',
    title: 'Causality is the only thing that matters in distributed systems',
    byline: 'Martin Kleppmann',
    siteName: 'martin.kleppmann.com',
    excerpt: 'Once you accept that, half of CAP becomes a rhetorical detour.',
    readingMinutes: 25,
    wordCount: 5_100,
    tags: ['systems', 'distributed-systems'],
    isStarred: true,
  },
  {
    url: 'https://www.brendangregg.com/blog/2026-02-17/cpu-flame-graphs-revisited.html',
    title: 'CPU flame graphs, revisited',
    byline: 'Brendan Gregg',
    siteName: 'brendangregg.com',
    excerpt: 'I keep meaning to write this up — modern Linux profilers fixed the three main complaints I had about the original technique.',
    readingMinutes: 14,
    wordCount: 2_900,
    tags: ['performance', 'linux'],
  },
  {
    url: 'https://stripe.com/blog/idempotency',
    title: 'Designing robust APIs with idempotency keys',
    byline: 'Brandur Leach',
    siteName: 'stripe.com',
    excerpt: 'The single most important pattern for any non-trivial HTTP API.',
    readingMinutes: 9,
    wordCount: 1_900,
    tags: ['api-design', 'reliability'],
  },
  {
    url: 'https://aphyr.com/posts/350-jepsen-postgresql-16',
    title: 'Jepsen: PostgreSQL 16',
    byline: 'Kyle Kingsbury',
    siteName: 'aphyr.com',
    excerpt: 'Postgres holds up well. Two edge cases worth knowing if you use logical replication.',
    readingMinutes: 30,
    wordCount: 6_200,
    tags: ['postgres', 'distributed-systems'],
  },
  {
    url: 'https://eieio.games/blog/the-only-correct-way-to-implement-zoom/',
    title: 'The only correct way to implement zoom',
    byline: 'Sam Greenwood',
    siteName: 'eieio.games',
    excerpt: 'Zoom is mathematically simple and behaviourally subtle.',
    readingMinutes: 7,
    wordCount: 1_500,
    tags: ['ui', 'graphics'],
  },
  {
    url: 'https://rachelbythebay.com/w/2026/02/02/dns/',
    title: 'It was DNS. It is always DNS.',
    byline: 'Rachel by the Bay',
    siteName: 'rachelbythebay.com',
    excerpt: 'I want to start a betting pool.',
    readingMinutes: 5,
    wordCount: 1_100,
    tags: ['ops', 'sre'],
    isRead: true,
  },
  {
    url: 'https://lethain.com/staff-eng/',
    title: 'Staff engineering archetypes',
    byline: 'Will Larson',
    siteName: 'lethain.com',
    excerpt: 'Tech-lead, architect, solver, right-hand. Pick one before your next perf cycle.',
    readingMinutes: 22,
    wordCount: 4_200,
    tags: ['career'],
  },
  {
    url: 'https://www.kalzumeus.com/2026/01/12/saas-pricing-2026/',
    title: 'SaaS pricing in 2026',
    byline: 'Patrick McKenzie',
    siteName: 'kalzumeus.com',
    excerpt: 'The cohort-of-one analysis I do for every SaaS I advise.',
    readingMinutes: 17,
    wordCount: 3_300,
    tags: ['business'],
  },
  {
    url: 'https://hpbn.co/transport-layer-security-tls/',
    title: 'Transport Layer Security (TLS)',
    byline: 'Ilya Grigorik',
    siteName: 'hpbn.co',
    excerpt: 'Read once a year. The numbers keep changing.',
    readingMinutes: 35,
    wordCount: 7_000,
    tags: ['security', 'networking'],
  },
  {
    url: 'https://signalvnoise.com/posts/3779-do-the-easy-thing',
    title: 'Do the easy thing first',
    byline: 'Jason Fried',
    siteName: 'signalvnoise.com',
    excerpt: 'A lot of ambition is just disguised procrastination.',
    readingMinutes: 4,
    wordCount: 800,
    tags: ['essays'],
  },
  {
    url: 'https://nelhage.com/post/computers-can-be-understood',
    title: 'Computers can be understood',
    byline: 'Nelson Elhage',
    siteName: 'nelhage.com',
    excerpt: 'Most performance bugs are not surprising once you commit to looking.',
    readingMinutes: 10,
    wordCount: 2_100,
    tags: ['debugging', 'systems'],
    isStarred: true,
  },
  {
    url: 'https://fasterthanli.me/articles/cargo-cult-rust',
    title: 'Cargo-cult Rust',
    byline: 'Amos Wenger',
    siteName: 'fasterthanli.me',
    excerpt: 'When does the borrow checker go from helpful to ritual?',
    readingMinutes: 19,
    wordCount: 3_900,
    tags: ['rust', 'language-design'],
  },
  {
    url: 'https://drewdevault.com/2026/03/01/2026-03-01-Self-hosting-2.html',
    title: 'The self-hosting bar in 2026',
    byline: 'Drew DeVault',
    siteName: 'drewdevault.com',
    excerpt: 'Most "self-hostable" projects still aren\'t. Here is the bar.',
    readingMinutes: 6,
    wordCount: 1_300,
    tags: ['self-hosting', 'foss'],
  },
  {
    url: 'https://jvns.ca/blog/2026/02/14/how-tcp-works/',
    title: 'How TCP works — the slightly-less-naive version',
    byline: 'Julia Evans',
    siteName: 'jvns.ca',
    excerpt: 'Diagrams included. You will need them.',
    readingMinutes: 11,
    wordCount: 2_300,
    tags: ['networking'],
    isRead: true,
  },
  {
    url: 'https://thume.ca/2026/01/structural-editing',
    title: 'Structural editing has finally arrived',
    byline: 'Tristan Hume',
    siteName: 'thume.ca',
    excerpt: 'Two-thirds of my keystrokes since Christmas have been structural.',
    readingMinutes: 13,
    wordCount: 2_700,
    tags: ['editors', 'tooling'],
  },
  {
    url: 'https://m.signalvnoise.com/the-quiet-leader/',
    title: 'The quiet leader',
    byline: 'Ryan Singer',
    siteName: 'signalvnoise.com',
    excerpt: 'The best PMs I know say almost nothing in meetings.',
    readingMinutes: 5,
    wordCount: 1_000,
    tags: ['management'],
  },
  {
    url: 'https://lobste.rs/s/abc123/please_dont_use_jwt',
    title: 'Please don\'t use JWT (still)',
    byline: 'Lobsters thread',
    siteName: 'lobste.rs',
    excerpt: 'The two-page summary of three RFCs I should have read first.',
    readingMinutes: 8,
    wordCount: 1_700,
    tags: ['security', 'api-design'],
  },
  {
    url: 'https://www.evanmiller.org/ab-testing/sequential.html',
    title: 'A primer on sequential A/B testing',
    byline: 'Evan Miller',
    siteName: 'evanmiller.org',
    excerpt: 'The number of times we should have stopped the test, but didn\'t.',
    readingMinutes: 20,
    wordCount: 4_100,
    tags: ['statistics', 'product'],
  },
  {
    url: 'https://blog.cloudflare.com/the-new-rust-edition-feature/',
    title: 'The new Rust edition feature I keep reaching for',
    byline: 'Anna Williams',
    siteName: 'blog.cloudflare.com',
    excerpt: 'It\'s not async. It\'s the lifetime elision rules.',
    readingMinutes: 9,
    wordCount: 1_900,
    tags: ['rust'],
  },
  {
    url: 'https://www.brandonsanderson.com/blogs/blog/the-mistakes-i-made-2026',
    title: 'The mistakes I made in 2025 — and didn\'t fix in 2026',
    byline: 'Brandon Sanderson',
    siteName: 'brandonsanderson.com',
    excerpt: 'Process post for writers, but the systems lessons travel.',
    readingMinutes: 16,
    wordCount: 3_200,
    tags: ['writing', 'process'],
  },
  {
    url: 'https://www.nature.com/articles/d41586-026-00345-x',
    title: 'How a single enzyme rewires the gut microbiome',
    byline: 'Nature News',
    siteName: 'nature.com',
    excerpt: 'A new look at metabolic interventions for IBS.',
    readingMinutes: 14,
    wordCount: 2_900,
    tags: ['science', 'biology'],
  },
  {
    url: 'https://www.economist.com/finance-and-economics/2026/03/05/the-end-of-cheap-capital',
    title: 'The end of cheap capital',
    byline: 'The Economist',
    siteName: 'economist.com',
    excerpt: 'What the new rate regime is doing to early-stage tech.',
    readingMinutes: 12,
    wordCount: 2_500,
    tags: ['economics', 'tech'],
    isRead: true,
  },
  {
    url: 'https://overreacted.io/use-cache-bookkeeping/',
    title: '"use cache" is bookkeeping',
    byline: 'Dan Abramov',
    siteName: 'overreacted.io',
    excerpt: 'The mental model that finally made it click for me.',
    readingMinutes: 11,
    wordCount: 2_300,
    tags: ['react', 'caching'],
  },
  {
    url: 'https://blog.zarjazz.com/2026/02/the-only-way-to-learn-music-theory/',
    title: 'The only way to learn music theory',
    byline: 'Zarjazz',
    siteName: 'blog.zarjazz.com',
    excerpt: 'Yes, you have to play. No, the book won\'t save you.',
    readingMinutes: 6,
    wordCount: 1_200,
    tags: ['music', 'learning'],
  },
  {
    url: 'https://www.theatlantic.com/health/2026/03/sleep-cycles-revisited/',
    title: 'Sleep cycles, revisited',
    byline: 'Ed Yong',
    siteName: 'theatlantic.com',
    excerpt: 'What the last two years of chronobiology research changed.',
    readingMinutes: 17,
    wordCount: 3_400,
    tags: ['science', 'health'],
  },
  {
    url: 'https://kentcdodds.com/blog/test-isolation-still-matters',
    title: 'Test isolation still matters',
    byline: 'Kent C. Dodds',
    siteName: 'kentcdodds.com',
    excerpt: 'Why I do not share fixtures across tests, even when it hurts.',
    readingMinutes: 8,
    wordCount: 1_700,
    tags: ['testing'],
  },
  {
    url: 'https://daringfireball.net/2026/02/the-mac-after-pocket',
    title: 'The Mac after Pocket',
    byline: 'John Gruber',
    siteName: 'daringfireball.net',
    excerpt: 'A short tour of the read-later landscape post-shutdown.',
    readingMinutes: 4,
    wordCount: 900,
    tags: ['software', 'mac'],
    isStarred: true,
  },
];

async function seed() {
  const email = process.env.DEMO_EMAIL ?? 'demo@tide.example';
  const inboundSlug = process.env.DEMO_INBOUND_SLUG ?? 'demo';

  const existing = await db().select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  const userId = existing[0]?.id ?? randomUUID();
  if (!existing[0]) {
    await db().insert(users).values({
      id: userId,
      email,
      emailVerified: true,
      name: 'demo',
      inboundSlug,
    });
    console.info(`[seed] created user ${email} (${userId})`);
  } else {
    console.info(`[seed] reusing user ${email} (${userId})`);
  }

  // Upsert tags
  const tagIds = new Map<string, string>();
  for (const seedRow of CURATED) {
    for (const name of seedRow.tags) {
      if (tagIds.has(name)) continue;
      const [t] = await db()
        .insert(tags)
        .values({ userId, name, source: 'user' })
        .onConflictDoNothing()
        .returning({ id: tags.id });
      let tagId = t?.id;
      if (!tagId) {
        const [existingTag] = await db()
          .select({ id: tags.id })
          .from(tags)
          .where(eq(tags.userId, userId))
          .limit(1);
        tagId = existingTag?.id;
      }
      if (tagId) tagIds.set(name, tagId);
    }
  }

  let inserted = 0;
  for (const s of CURATED) {
    const canonical = canonicalizeUrl(s.url);
    const hash = urlHash(canonical);
    const articleId = randomUUID();
    const placeholderHtml = `<p>${escapeHtml(s.excerpt)}</p><p><i>(seeded — extract on first open)</i></p>`;
    const placeholderText = s.excerpt;

    const [row] = await db()
      .insert(articles)
      .values({
        id: articleId,
        userId,
        url: s.url,
        canonicalUrl: canonical,
        urlHash: hash,
        title: s.title,
        byline: s.byline,
        siteName: s.siteName,
        excerpt: s.excerpt,
        readingMinutes: s.readingMinutes,
        wordCount: s.wordCount,
        contentHtml: placeholderHtml,
        contentText: placeholderText,
        state: 'ready',
        source: 'web' as ArticleSource,
        isRead: s.isRead ?? false,
        isStarred: s.isStarred ?? false,
      })
      .onConflictDoNothing()
      .returning({ id: articles.id });
    if (row) {
      inserted++;
      for (const name of s.tags) {
        const tagId = tagIds.get(name);
        if (!tagId) continue;
        await db().insert(articleTags).values({ articleId: row.id, tagId }).onConflictDoNothing();
      }
    }
  }
  console.info(`[seed] inserted ${inserted} of ${CURATED.length} articles for ${email}`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

seed().then(
  () => process.exit(0),
  (err) => {
    console.error('[seed] failed', err);
    process.exit(1);
  },
);
