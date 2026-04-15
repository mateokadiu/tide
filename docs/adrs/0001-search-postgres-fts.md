# ADR-0001 — Search runs on Postgres FTS + pg_trgm (not Algolia / Meilisearch)

- **Status**: accepted
- **Date**: 2026-01-22
- **Context**: `tide` needs search across an individual user's library. The
  obvious externals are Algolia, Meilisearch, Typesense, and Elastic.

## Decision

Run search on Postgres. Specifically:

- `tsvector` column maintained by trigger across `(title, byline, excerpt,
  content_text)` with weighted setweight (`A` title → `D` body).
- `websearch_to_tsquery('english', …)` for the user-facing query parser.
- `pg_trgm` GIN index on `title` for typo-tolerance + autocomplete.
- `ts_rank_cd` + a similarity boost for relevance scoring.

## Why not Algolia / Meilisearch / Typesense

- **Operational cost.** Single-tenant search per self-hoster. Even a tiny
  Meili instance is one more container + its own data dir + its own backups +
  its own auth.
- **Latency budget.** With < 100k articles per user and the index on the same
  Postgres we already query, p95 query latency is < 25ms in our benchmarks.
  That's lower than the network hop to a managed search service.
- **Data gravity.** Highlights, tags, sharing, and the embedding vector all
  live in Postgres. Forking search out doubles the consistency surface.
- **Self-host bar.** Per the [README](../../README.md), self-host needs to be
  one Docker Compose. Adding a second service for sub-2-digit-ms gains is not
  the right trade.

## Why not Elastic

Elastic's footprint (heap, snapshot tooling, version skew) is a non-starter on
a 1-vCPU/1GB Oracle Cloud Always-Free node. We target that node as the cloud
self-host SKU; everything else flows from it.

## Re-evaluation triggers

- Recall on long natural-language queries drops below 0.7 on a representative
  10k-article sample. (We accept this; semantic search via pgvector covers it
  in the hybrid path.)
- p99 search latency exceeds 250ms at the 95th-percentile library size.
- A user reports they want cross-account search (out of scope per
  [PLAN.md §3](../../PLAN.md)).

## Implementation notes

The hybrid search in `lib/search/index.ts` blends `ts_rank_cd` with cosine
similarity from the embedding column. Pure-FTS for short queries (< 4 tokens);
hybrid above that. The pgvector path is gated on `supportsVector()` so SQLite
deployments degrade to LIKE-on-title.
