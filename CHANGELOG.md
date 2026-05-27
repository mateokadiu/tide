# Changelog

All notable changes land here. Tide follows semver from `v0.1.0`.

## [Unreleased]

## [0.1.0] — 2026-06-22

The first shippable release. Everything in [PLAN.md](./PLAN.md) is built and
tested.

### Added

- **Capture surfaces.** Web paste, Chrome + Firefox MV3 extension, PWA Web
  Share Target API, Resend inbound email-to-save, `POST /api/v1/articles`
  bearer-token REST API.
- **Reader.** RSC-streamed, typographic-first: serif/sans/mono toggle, four
  sizes, three widths, light / dark / sepia, justified mode, bionic reading
  mode, browser `speechSynthesis` listen mode, `j`/`k`/`m`/`a`/`s` keyboard
  shortcuts.
- **Highlights.** Selection-to-highlight (five colours), notes, XPath-based
  anchors restored across re-extractions.
- **Search.** Postgres FTS (`tsvector` + weighted setweight), trigram
  similarity boost on title, pgvector cosine ANN. Hybrid mode auto-blends
  for long queries.
- **AI features.** Anthropic `claude-haiku-4-5` summaries (streamed via
  React Suspense) + auto-tagging. Voyage 3.5 primary embeddings; OpenAI
  `text-embedding-3-small` 1024-trim fallback.
- **Sharing.** Per-article public toggle → `/s/[slug]` with dynamic OG
  image route.
- **Progress sync.** Debounced scroll position → server action → restored
  on the next open.
- **SSE.** `/api/sse/notifications` fans out per-user events via Redis
  pub/sub. Toast notifications in the client.
- **Self-host.** Docker Compose (app + pg + redis + minio + traefik),
  Pulumi-TS recipe targeting Oracle Cloud Always-Free, single-binary mode
  with SQLite + local FS via `pnpm build:standalone`.
- **SDK.** `@tide/sdk` typed client. `saveArticle`, `listArticles`, full
  zod schemas exported.
- **Public REST API.** `POST` / `GET` / `PATCH` / `DELETE
  /api/v1/articles[/id]`, `GET /api/v1/health`.
- **CI.** GitHub Actions: typecheck + lint + test + build + Playwright E2E
  + Lighthouse audit.
- **Seed.** `pnpm seed:demo` — 30 curated articles for the `demo@tide.example`
  user.
- **Docs.** ADR-0001 through ADR-0009 covering search, extraction, auth, LLM,
  queue, embeddings, storage, cloud target, and the v1.x roadmap. Performance
  numbers in `docs/performance.md`.

### Quality

- 33+ unit/integration tests across vitest + extraction snapshots.
- 0 TypeScript errors (strict + `noUncheckedIndexedAccess` +
  `exactOptionalPropertyTypes`).
- 0 Biome lint errors.
- Lighthouse mobile: 100 / 100 / 96 / 100 (perf / a11y / best-practices /
  SEO). Desktop: 100 / 100 / 96 / 100.

[unreleased]: https://github.com/mateokadiu/tide/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mateokadiu/tide/releases/tag/v0.1.0
