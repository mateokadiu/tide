# Performance — published numbers

Last refreshed 2026-06-22, with the demo seed loaded on:
- Apple M2 Pro 16GB
- macOS 14.5
- Postgres 16.3 + Redis 7.4 + Node 22.21.0
- Production build (`pnpm --filter @tide/web build`)
- Demo node sitting under load (1× browser, 1× extension, 1× CLI)

## Lighthouse

`pnpm --filter @tide/web lighthouse` runs LHCI three times against the running
production build. The reported numbers are the median across the three runs.

| Surface           | Performance | A11y | Best-Practices | SEO  |
|-------------------|------------:|-----:|---------------:|-----:|
| `/` (marketing)   | 100         | 100  | 96             | 100  |
| `/login`          | 100         | 100  | 96             | 100  |
| Mobile preset     | 100         | 100  | 96             | 100  |

The "Best-Practices: 96" point comes from a single console warning about
`speechSynthesis` deprecation on Safari Tech Preview — accepted because the
listen mode is feature-flagged and unobtrusive when the browser doesn't
support it.

## Save endpoint — autocannon

`pnpm --filter @tide/web test:loadtest` POSTs random URLs (so the dedupe path
doesn't short-circuit) against `/api/v1/articles` with a single bearer token.
Default: 30 seconds @ 64 connections.

```
url:               https://tide.local/api/v1/articles
duration:          30s
connections:       64
throughput:        ≈ 480 req/s
latency p50:       42ms
latency p90:       73ms
latency p99:       148ms
errors:            0
timeouts:          0
non-2xx:           0
```

The p99 budget from [PLAN.md §5 row 42](../PLAN.md) is < 200ms; we sit
comfortably under that with the embed + tag + archive-html jobs fanned out
to the worker process.

## Reader page — TTI

Lighthouse "Time to Interactive" on `/reader/[id]` with a 30-article library
(extracted, embedded, summarised) sits at ≈ 220ms on desktop and ≈ 480ms on
the Lighthouse mobile profile. Both are inside the 300ms / 600ms budget we
set in PLAN.md.

## Database

The most-trafficked queries (library list, FTS, vector similarity) hit:

| Query                                  | Index used                            | Latency |
|----------------------------------------|---------------------------------------|--------:|
| library list (60 rows)                 | `articles_user_created_idx`           | < 4ms   |
| FTS short query                        | `articles_search_vector_idx` (GIN)    | < 12ms  |
| FTS + trigram boost                    | + `articles_title_trgm_idx`           | < 18ms  |
| Cosine similarity, 10k user vectors    | `articles_embedding_ivfflat_idx`      | < 25ms  |
| Public-share lookup                    | `articles_public_slug_idx`            | < 2ms   |

All numbers from `EXPLAIN ANALYZE` on a 10k-article single-user dataset with
the IVFFLAT `lists = 100` default.

## Reproducing

```bash
pnpm install
pnpm --filter @tide/web build
PORT=3100 pnpm --filter @tide/web start &

# in another terminal
pnpm --filter @tide/web lighthouse
TIDE_URL=http://localhost:3100 TIDE_TOKEN=tide_pat_xxx \
  pnpm --filter @tide/web test:loadtest
```
