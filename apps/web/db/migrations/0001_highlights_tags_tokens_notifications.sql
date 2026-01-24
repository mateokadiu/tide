-- highlights
CREATE TABLE IF NOT EXISTS "highlights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "article_id" uuid NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "note" text,
  "color" text NOT NULL DEFAULT 'cyan',
  "start_container" text NOT NULL,
  "end_container" text NOT NULL,
  "start_offset" text NOT NULL,
  "end_offset" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "highlights_user_article_idx"
  ON "highlights" ("user_id", "article_id");
CREATE INDEX IF NOT EXISTS "highlights_article_idx" ON "highlights" ("article_id");

-- tags
CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "source" text NOT NULL DEFAULT 'user',
  "color" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "tags_user_name_idx" ON "tags" ("user_id", "name");
CREATE INDEX IF NOT EXISTS "tags_user_idx" ON "tags" ("user_id");

CREATE TABLE IF NOT EXISTS "article_tags" (
  "article_id" uuid NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("article_id", "tag_id")
);
CREATE INDEX IF NOT EXISTS "article_tags_tag_idx" ON "article_tags" ("tag_id");

-- api tokens
CREATE TABLE IF NOT EXISTS "api_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "prefix" text NOT NULL,
  "scopes" text NOT NULL DEFAULT 'articles:write',
  "last_used_at" timestamptz,
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "api_tokens_user_idx" ON "api_tokens" ("user_id");

-- notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "payload" text,
  "read" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "notifications_user_created_idx"
  ON "notifications" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx"
  ON "notifications" ("user_id", "read");
