import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Bearer tokens for the public REST API.
 * The plaintext token is shown once at creation; we store a sha256 hash.
 */
export const apiTokens = pgTable(
  'api_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** sha256 of `tide_pat_{nonce}`. */
    tokenHash: text('token_hash').notNull().unique(),
    /** First 8 chars of the plaintext token, shown in the settings UI. */
    prefix: text('prefix').notNull(),
    /** Comma-separated scope list: `articles:write`, `articles:read`. */
    scopes: text('scopes').notNull().default('articles:write'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('api_tokens_user_idx').on(t.userId),
  }),
);

export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;
