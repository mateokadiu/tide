# ADR-0006 — Embeddings: Voyage 3.5 primary, OpenAI fallback

- **Status**: accepted
- **Date**: 2026-02-14
- **Context**: We need an embedding model for semantic search ("similar to
  this") and the related-articles surface on the reader page. The shape we
  store in pgvector is fixed (`vector(1024)`).

## Decision

Two providers, swappable via env:

- **Primary**: Voyage AI `voyage-3.5` (1024-dim). Best price/quality on
  retrieval benchmarks we trust as of early 2026; permissive licensing for
  commercial use.
- **Fallback**: OpenAI `text-embedding-3-small` (1536-dim). Trim to 1024 +
  L2-renormalise at the boundary so we can store both in the same column.

Both call paths live in `lib/ai/embeddings.ts`. The fallback fires
automatically if Voyage returns non-OK; we don't surface that to the user.
Either provider can be the only one configured — the missing one is just
skipped.

## Why two providers

- **Rate-limit risk.** Voyage's tier limits are lower than OpenAI's. A user
  importing 500 articles from a Pocket export shouldn't degrade because of
  one provider's hourly cap.
- **Geo-availability.** OpenAI works in regions Voyage doesn't, and vice
  versa.
- **No single point of failure.** Either provider can outage; the embed job
  retries via BullMQ and re-tries the other provider on the next attempt.

## Storage dimension

`vector(1024)` is the storage shape. The OpenAI fallback truncates from 1536
to 1024 (head-truncation, L2 renorm). Truncation is well-defined for the
3-small model and we've validated retrieval quality holds; we don't store
1536-dim vectors mixed with 1024-dim ones because the ivfflat index can't
handle that.

## ivfflat vs HNSW

`pgvector` 0.7+ supports HNSW. We chose ivfflat for v1 because:
- Builds faster at small scale (sub-10k vectors per user).
- Tuning is one knob (`lists`) — we ship with `lists = 100` and re-tune at
  100k+ vectors per user.
- HNSW gives higher recall but uses more memory; the self-host bar matters
  more than the recall ceiling.

We will migrate to HNSW if average recall on a sampled query set drops
below 0.85 at scale.

## Re-evaluation triggers

- Voyage prices increase 2× or licensing changes.
- A new local embedding model becomes both license-clean and quality-
  competitive on retrieval at sub-100ms latency.
- pgvector recall on 100k+ vectors drops below 0.9 on the benchmark set.
