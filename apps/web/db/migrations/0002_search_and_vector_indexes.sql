-- FTS: tsvector from (title, byline, excerpt, content_text) with English config.
-- Trigram: pg_trgm GIN index on title for typo-tolerant lookups.
-- Vector: IVFFLAT on embedding for ANN cosine search.

CREATE OR REPLACE FUNCTION tide_articles_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title,    '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.byline,   '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.excerpt,  '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.content_text, '')), 'D');
  NEW.updated_at := now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articles_search_vector_trigger ON "articles";
CREATE TRIGGER articles_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, byline, excerpt, content_text
  ON "articles"
  FOR EACH ROW
  EXECUTE FUNCTION tide_articles_search_vector_update();

-- GIN index for FTS ranking
CREATE INDEX IF NOT EXISTS articles_search_vector_idx
  ON "articles" USING GIN (search_vector);

-- Trigram index on title for autocomplete + typo tolerance
CREATE INDEX IF NOT EXISTS articles_title_trgm_idx
  ON "articles" USING GIN (title gin_trgm_ops);

-- IVFFLAT index for vector cosine search.
-- Lists tuned for ~10k articles per user; re-tune if recall drops.
CREATE INDEX IF NOT EXISTS articles_embedding_ivfflat_idx
  ON "articles"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- updated_at trigger (lightweight)
CREATE OR REPLACE FUNCTION tide_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_touch_updated_at ON "users";
CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION tide_touch_updated_at();
