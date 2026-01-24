import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { articles } from './articles';
import { users } from './users';

export const highlights = pgTable(
  'highlights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),

    /** Verbatim quoted text. */
    text: text('text').notNull(),
    /** Optional user note attached to the highlight. */
    note: text('note'),
    /** Color: yellow | green | blue | pink (default: primary cyan). */
    color: text('color', { enum: ['cyan', 'yellow', 'green', 'blue', 'pink'] })
      .notNull()
      .default('cyan'),

    /** DOM XPath of the start container, used for restoration. */
    startContainer: text('start_container').notNull(),
    /** DOM XPath of the end container. */
    endContainer: text('end_container').notNull(),
    startOffset: text('start_offset').notNull(),
    endOffset: text('end_offset').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userArticleIdx: index('highlights_user_article_idx').on(t.userId, t.articleId),
    articleIdx: index('highlights_article_idx').on(t.articleId),
  }),
);

export type Highlight = typeof highlights.$inferSelect;
export type NewHighlight = typeof highlights.$inferInsert;
