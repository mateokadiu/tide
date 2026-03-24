import {
  boolean,
  customType,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/** pgvector(1024) for Voyage / 1536 for OpenAI fallback. Stored as 1024 default. */
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1024)';
  },
  toDriver(value: number[]) {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string) {
    return value
      .slice(1, -1)
      .split(',')
      .map((n) => Number(n));
  },
});

const tsvector = customType<{ data: unknown; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** Original URL as the user submitted it. */
    url: text('url').notNull(),
    /** Canonical URL after extraction (rel=canonical / og:url). */
    canonicalUrl: text('canonical_url').notNull(),
    /** sha256(canonicalUrl) — dedupe key with userId. */
    urlHash: text('url_hash').notNull(),

    title: text('title').notNull(),
    byline: text('byline'),
    siteName: text('site_name'),
    lang: text('lang').default('en'),
    excerpt: text('excerpt'),
    leadImageUrl: text('lead_image_url'),

    /** Sanitised HTML used by the reader view. */
    contentHtml: text('content_html'),
    /** Plain text used for FTS + embeddings. */
    contentText: text('content_text'),

    /** R2 / MinIO / local key under which the raw archived HTML lives. */
    archiveKey: text('archive_key'),

    wordCount: integer('word_count').default(0),
    readingMinutes: real('reading_minutes').default(0),

    state: text('state', { enum: ['pending', 'extracting', 'ready', 'failed'] })
      .notNull()
      .default('pending'),
    failureReason: text('failure_reason'),

    isArchived: boolean('is_archived').notNull().default(false),
    isRead: boolean('is_read').notNull().default(false),
    isStarred: boolean('is_starred').notNull().default(false),

    /** Per-article public share toggle. */
    isPublic: boolean('is_public').notNull().default(false),
    publicSlug: text('public_slug'),

    /** Scroll progress 0..1, debounced from the reader. */
    progress: real('progress').notNull().default(0),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),

    /** Embedding vector for semantic search; null until the embed job runs. */
    embedding: vector('embedding'),
    /** GENERATED FTS column populated by trigger; see migration 0003. */
    searchVector: tsvector('search_vector'),

    /** AI-generated summary, populated on demand. */
    summary: text('summary'),
    summaryGeneratedAt: timestamp('summary_generated_at', { withTimezone: true }),

    /** Capture surface: web | extension | pwa | email | api. */
    source: text('source', { enum: ['web', 'extension', 'pwa', 'email', 'api'] })
      .notNull()
      .default('web'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userUrlHashIdx: uniqueIndex('articles_user_url_hash_idx').on(t.userId, t.urlHash),
    userCreatedIdx: index('articles_user_created_idx').on(t.userId, t.createdAt),
    userStateIdx: index('articles_user_state_idx').on(t.userId, t.state),
    publicSlugIdx: uniqueIndex('articles_public_slug_idx').on(t.publicSlug),
    // pgvector / tsvector indexes are created via raw SQL in the migration
    // (Drizzle Kit doesn't emit operator class hints for IVFFLAT / GIN).
  }),
);

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type ArticleState = Article['state'];
export type ArticleSource = Article['source'];
