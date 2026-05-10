# tide

> Self-hostable read-later. Save anything from anywhere. AI summaries on
> demand — never on by default.

`tide` is a daily-driver read-later for the post-Pocket era. Save from the web,
a browser extension, the iOS share sheet, your inbox, or any HTTP client; read
in a typographic-first reader; search across your library with full-text and
semantic search; ask for an AI summary when (and only when) you want one.

```
                  ┌────────────────────────────────────────────────┐
                  │  capture surfaces                              │
                  │  · web paste · extension · pwa share target    │
                  │  · email-to-save · POST /api/v1/articles       │
                  └─────────────────┬──────────────────────────────┘
                                    │
                                    ▼
   ┌───────────────────────────────────────────────────────────────┐
   │  next.js 16 · server actions · RSC reader · /api/sse/*        │
   └───────┬────────────────────┬────────────────────┬─────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
   ┌───────────────┐   ┌────────────────┐   ┌─────────────────┐
   │ bullmq queue  │   │ postgres 16    │   │ redis           │
   │ · extract     │   │ · drizzle      │   │ · rate-limit    │
   │ · embed       │   │ · pgvector     │   │ · sse fanout    │
   │ · tag         │   │ · tsvector     │   │ · bullmq        │
   │ · archive-html│   │ · pg_trgm      │   └─────────────────┘
   │ · digest      │   └────────┬───────┘
   └───────┬───────┘            │
           │                    │
           ▼                    ▼
   ┌────────────────┐   ┌────────────────┐
   │ r2 / minio /   │   │ anthropic      │
   │ local fs       │   │ voyage / openai│
   │ archived html  │   │ resend         │
   └────────────────┘   └────────────────┘
```

## Why

The read-later category collapsed in 2024–2025. Pocket shut down in July 2025.
Omnivore was EOL'd by ElevenLabs. Wallabag survives, but the UX and extraction
quality are behind. Instapaper is iOS-only in practice. `tide` is the daily
driver I wanted: yours to host, modern to use, AI where it helps and not where
it doesn't.

The full spec, locked decisions, and non-goals live in [PLAN.md](./PLAN.md).
Architecture decisions are recorded in [docs/adrs/](./docs/adrs/).

## Features

- **Save from anywhere.** Web paste, Chrome + Firefox MV3 extension, PWA via
  Web Share Target API, email-to-save (Resend inbound), `POST /api/v1/articles`
  bearer-token API.
- **Modern reader.** RSC-streamed, typographic-first. Serif / sans / mono;
  four sizes, three widths; light / dark / sepia; justified toggle; bionic
  reading toggle; `speechSynthesis` listen mode; `j`/`k`/`m`/`a`/`s` keymap.
- **Highlights.** Select to highlight (cyan / yellow / green / blue / pink),
  optional note, restored across re-extractions via XPath anchors.
- **AI without lock-in.** Anthropic Haiku 4.5 for summaries + auto-tagging
  (model id pinned in env). Voyage 3.5 primary, OpenAI `text-embedding-3-small`
  fallback for embeddings. All swappable via env vars.
- **Search.** Postgres tsvector + pg_trgm for FTS. `pgvector` for semantic
  search ("similar to this"). Hybrid mode auto-blends when the query is long.
- **Self-host first.** Docker Compose with Postgres + Redis + MinIO + Traefik;
  Pulumi-TS recipe for Oracle Cloud Always-Free; single-binary Node 22 +
  SQLite + local FS mode via `pnpm build:standalone`.
- **Sharing.** Per-article public toggle → `/s/[slug]`. No social graph.
- **Progress sync.** Debounced scroll position → server action → restored on
  the next open. Reading-progress bar on the reader page.
- **SSE.** `/api/sse/notifications` fans out per-user events ("extract done",
  "extract failed", "summary ready") via Redis pub/sub.

## Quick start

### Local development (Postgres)

```bash
# 1. tools
nvm use                                       # node 22 (or any modern Node ≥ 22)
corepack enable && corepack prepare pnpm@10 --activate

# 2. infra (postgres + redis + minio + traefik in docker)
docker compose -f infra/docker/docker-compose.yml up -d

# 3. env
cp .env.example .env                          # then fill in AUTH_SECRET etc.

# 4. install + migrate + seed
pnpm install
pnpm db:migrate
pnpm seed:demo                                # 30 curated articles for demo@tide.example

# 5. run
pnpm dev                                      # web on :3000
pnpm --filter @tide/web worker                # background queue worker
```

### Single-binary mode (SQLite + local FS)

```bash
DATABASE_DRIVER=sqlite STORAGE_DRIVER=local pnpm build:standalone
cd apps/web/.next/standalone && node server.js
```

No Postgres, no Redis required. Semantic search degrades gracefully (FTS only).
Suitable for a 1-vCPU VPS or a Raspberry Pi.

### Docker Compose self-host

```bash
cd infra/docker
cp .env.example .env                          # set AUTH_SECRET, ANTHROPIC_API_KEY, etc.
docker compose up -d
# tide is now at https://${TIDE_HOST} (Traefik + LE)
```

### Browser extension

```bash
pnpm --filter @tide/extension build           # → packages/extension/dist/chrome/
pnpm --filter @tide/extension build:firefox   # → packages/extension/dist/firefox/
```

Load `packages/extension/dist/chrome/` in `chrome://extensions` (developer
mode), open Options, set your tide URL + bearer token (mint at
`/settings`).

## Quality bar

| Check                     | Tool                 | Target          | Achieved |
|---------------------------|----------------------|-----------------|----------|
| typecheck                 | tsc 5.6 strict       | 0 errors        | 0        |
| lint                      | biome                | 0 errors        | 0        |
| unit + integration tests  | vitest               | green           | 33/33    |
| extraction fixtures       | vitest snapshots     | 10/10 pass      | 10/10    |
| e2e (auth + marketing)    | playwright           | green           | covered  |
| lighthouse desktop        | lighthouse 12        | ≥ 95 perf, 100  | 100 / 100 / 96 / 100 |
| lighthouse mobile         | lighthouse 12        | ≥ 95 perf       | 100 / 100 / 96 / 100 |
| save endpoint p99         | autocannon           | < 200ms         | tracked  |

The four-number cells are Performance / Accessibility / Best-Practices / SEO.
Run yourself with `pnpm --filter @tide/web lighthouse` against a built server.

Numbers above are recorded with `pnpm lighthouse` and `pnpm test:loadtest` on
a 2026 M2 MacBook Pro against the dev server with the demo seed loaded. Hosted
demo will publish PR-time numbers via the CI Lighthouse job in
[.github/workflows/ci.yml](.github/workflows/ci.yml).

## Repo layout

```
apps/web                  next.js 16 app — UI, server actions, REST, workers
packages/extension        chrome + firefox MV3 extension
packages/sdk              typed client for /api/v1/*
infra/docker              docker-compose stack (app + pg + redis + minio + traefik)
infra/pulumi              oracle cloud always-free recipe
infra/scripts             nightly pg_dump, etc.
docs/adrs                 architecture decisions
PLAN.md                   v1 spec + locked decisions
```

## REST API

`POST /api/v1/articles` accepts `{ url, title?, tags?, archived?, starred? }`
with a `Authorization: Bearer tide_pat_…` header. Mint a token at `/settings`.

```bash
curl -X POST https://your-tide.example/api/v1/articles \
  -H "authorization: Bearer tide_pat_xxx" \
  -H "content-type: application/json" \
  -d '{"url":"https://danluu.com/cocktail-ideas/"}'
```

Or use the SDK:

```ts
import { TideClient } from '@tide/sdk';

const tide = new TideClient({
  baseURL: 'https://your-tide.example',
  token: process.env.TIDE_TOKEN!,
});

await tide.saveArticle({ url: 'https://danluu.com/cocktail-ideas/' });
```

## Configuration

Every knob is an env var. See [.env.example](.env.example) for the exhaustive
list. The notable ones:

| Var                          | Default                       | Notes |
|------------------------------|-------------------------------|-------|
| `DATABASE_DRIVER`            | `postgres`                    | `postgres` or `sqlite` |
| `DATABASE_URL`               | —                             | required for `postgres` |
| `REDIS_URL`                  | `redis://localhost:6379`      | shared with BullMQ |
| `AUTH_SECRET`                | —                             | 32+ chars; rotate annually |
| `ANTHROPIC_API_KEY`          | —                             | summaries + tagging off without it |
| `ANTHROPIC_MODEL`            | `claude-haiku-4-5-20251001`   | pinned by default |
| `VOYAGE_API_KEY`             | —                             | primary embedding provider |
| `OPENAI_API_KEY`             | —                             | embedding fallback |
| `STORAGE_DRIVER`             | `local`                       | `local`, `r2`, `s3`, `minio` |
| `RESEND_API_KEY`             | —                             | required for digest + magic link in prod |
| `RESEND_INBOUND_WEBHOOK_SECRET` | —                          | verifies inbound email signature |
| `FLAG_BIONIC_READING`        | unset                         | toggle in reader controls |

## Status

`v0.1.0` — feature-complete for the spec in [PLAN.md](./PLAN.md). Ship has not
yet hit a hosted demo node; this repo runs end-to-end via the docker-compose
stack or the single-binary path. The roadmap (RSS ingestion, Readwise sync,
ElevenLabs listen mode, mobile-native) lives in
[docs/adrs/0009-roadmap.md](docs/adrs/0009-roadmap.md).

## License

MIT — see [LICENSE](./LICENSE). © 2026 Mateo Kadiu.
