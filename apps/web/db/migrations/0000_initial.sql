-- tide initial schema (postgres + pgvector + pg_trgm + tsvector)
-- generated 2026-01-25; do not edit directly — modify db/schema and regenerate.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "email_verified" boolean NOT NULL DEFAULT false,
  "name" text,
  "image" text,
  "inbound_slug" text NOT NULL,
  "reader_prefs" text NOT NULL DEFAULT '{"font":"serif","size":"md","width":"medium","theme":"dark","justified":false,"bionic":false}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_inbound_slug_idx" ON "users" ("inbound_slug");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" ("created_at");

-- ─────────────────────────────────────────────────────────
-- sessions / accounts / verifications
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "user_agent" text,
  "ip_address" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions" ("token");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider_id" text NOT NULL,
  "account_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_account_idx"
  ON "accounts" ("provider_id", "account_id");
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" ("user_id");

CREATE TABLE IF NOT EXISTS "verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- articles
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "articles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "canonical_url" text NOT NULL,
  "url_hash" text NOT NULL,
  "title" text NOT NULL,
  "byline" text,
  "site_name" text,
  "lang" text DEFAULT 'en',
  "excerpt" text,
  "lead_image_url" text,
  "content_html" text,
  "content_text" text,
  "archive_key" text,
  "word_count" integer DEFAULT 0,
  "reading_minutes" real DEFAULT 0,
  "state" text NOT NULL DEFAULT 'pending',
  "failure_reason" text,
  "is_archived" boolean NOT NULL DEFAULT false,
  "is_read" boolean NOT NULL DEFAULT false,
  "is_starred" boolean NOT NULL DEFAULT false,
  "is_public" boolean NOT NULL DEFAULT false,
  "public_slug" text,
  "progress" real NOT NULL DEFAULT 0,
  "last_read_at" timestamptz,
  "embedding" vector(1024),
  "search_vector" tsvector,
  "summary" text,
  "summary_generated_at" timestamptz,
  "source" text NOT NULL DEFAULT 'web',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "articles_user_url_hash_idx"
  ON "articles" ("user_id", "url_hash");
CREATE INDEX IF NOT EXISTS "articles_user_created_idx"
  ON "articles" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "articles_user_state_idx"
  ON "articles" ("user_id", "state");
CREATE UNIQUE INDEX IF NOT EXISTS "articles_public_slug_idx"
  ON "articles" ("public_slug") WHERE "public_slug" IS NOT NULL;
