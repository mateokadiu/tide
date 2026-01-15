# tide — Plan & Locked Decisions

> Drafted 2026-01-15. This document is the contract for v1. Decisions here are
> locked unless a follow-up ADR overrides them in `docs/adrs/`.

## 1. Problem

The read-later category collapsed in 2024–2025:

- **Pocket** shut down 8 July 2025 after Mozilla deprecated it in May 2025.
  Existing exports stopped working a few months later. ~30M users left
  without a maintained tool.
- **Omnivore** was EOL'd in November 2024 after being acquired by ElevenLabs.
  Self-hosters were given six months to migrate. The OSS repo still exists
  but receives no security or extraction-engine updates.
- **Wallabag** is the obvious open-source survivor but the UX is dated, the
  AI surfaces are absent, and the default extraction quality is well behind
  Readability-based pipelines from 2024+.
- **Instapaper** still ships but the team is small, the iOS-first design is
  showing its age on web, and there is no self-host story.

Concrete gap: a daily-driver read-later that you can run yourself, save into
from anywhere, read beautifully, and which uses an LLM where it actually helps
(summaries on demand, semantic search, weekly digests) rather than as a
marketing veneer.

## 2. Goals (v1)

- **Daily-driver utility.** Save in under 200ms p50. Reader opens in under
  300ms TTI on a 30-article library.
- **Save from anywhere.** Web paste, browser extension (Chrome + Firefox),
  iOS share sheet (PWA), email-to-save, REST API for shortcuts integrations.
- **Modern reader.** Typographic priority. Configurable font, size, line
  width, theme. Selection-to-highlight. Listen mode. Bionic toggle.
- **Self-hostable.** Docker Compose for VPS; Pulumi recipe for Oracle Cloud
  Always-Free; single-binary mode for solo Node 22 hosts.
- **AI without lock-in.** Anthropic for summaries, Voyage primary +
  OpenAI fallback for embeddings, all swappable via env. No vendor lock.
- **Quality bar.** Lighthouse 95+ mobile / 100 desktop. Zero typecheck
  errors. Biome clean. A11y keyboard-navigable. 10+ extraction snapshot
  tests pinned to real fixtures.

## 3. Non-goals (v1)

- Teams / workspaces / shared libraries. Single-user per account.
- Social graph, public profiles, follow-someone's-library. Per-article
  public sharing only.
- Native iOS / Android apps. PWA covers it. Native is a v2 question.
- Bring-your-own LLM provider beyond Anthropic + OpenAI + Voyage. Pluggable
  is a v2 question.
- Browser-side extraction in the extension. Server-side only — fewer
  surprises, better paywall handling, archival HTML is centralised.
- Annotations export to Readwise / Notion in v1 (ADR-TBD for v1.1).
- Multi-tenant teams, shared libraries, role-based access.
- Native desktop apps.
- Inbound RSS/feed ingestion (v1.1; users save individual articles for now).
- Importing from Pocket / Omnivore / Instapaper exports (v1.1; documented manual path via the REST API).
- Paid plans / billing. Self-host model; the demo node is best-effort.
- iCal / calendar integration. Not a calendar product.

## 4. Architecture

```
                          ┌────────────────────────────────┐
                          │  capture surfaces              │
                          │  ─ web paste                   │
                          │  ─ ext (chrome / firefox)      │
                          │  ─ pwa share target            │
                          │  ─ email-to-save (resend)      │
                          │  ─ POST /api/v1/articles       │
                          └────────────┬───────────────────┘
                                       │
                                       ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  next.js 16 app router (rsc default, ppr incremental)           │
   │  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
   │  │ server       │   │ server       │   │ /api/webhooks/*      │ │
   │  │ actions      │   │ components   │   │ /api/v1/* (edge)     │ │
   │  │ (mutations)  │   │ (reads)      │   │ /api/sse/*           │ │
   │  └──────┬───────┘   └──────┬───────┘   └──────────┬───────────┘ │
   └─────────┼──────────────────┼──────────────────────┼─────────────┘
             │                  │                      │
             ▼                  ▼                      ▼
   ┌──────────────────┐   ┌──────────────┐    ┌──────────────────┐
   │  bullmq queue    │   │  postgres 16 │    │  redis (state)   │
   │  ─ extract       │   │  ─ drizzle   │    │  ─ rate-limit    │
   │  ─ embed         │   │  ─ pgvector  │    │  ─ sse fanout    │
   │  ─ summarize     │   │  ─ tsvector  │    │  ─ bullmq        │
   │  ─ archive-html  │   │  ─ trigram   │    └──────────────────┘
   │  ─ weekly-digest │   └──────┬───────┘
   └────────┬─────────┘          │
            │                    │
            ▼                    ▼
   ┌──────────────────┐   ┌──────────────────┐
   │  r2 / minio      │   │  anthropic       │
   │  ─ archived html │   │  voyage / openai │
   │  ─ images        │   │  resend          │
   └──────────────────┘   └──────────────────┘
```

Single Postgres for both relational and vector workloads (pgvector). A
second database in v1 buys complexity, not throughput.

## 5. Locked decisions

| #  | Decision                            | Choice                                                            | Reasoning |
| -- | ----------------------------------- | ----------------------------------------------------------------- | --------- |
| 1  | Web framework                       | Next.js 16 App Router, RSC default, `ppr: 'incremental'`          | RSC keeps the reader payload small; PPR for marketing + share pages. |
| 2  | UI                                  | React 19, Tailwind v4, shadcn/ui                                  | RSC-friendly, no runtime CSS-in-JS, owns its own primitives. |
| 3  | Type system                         | TypeScript 5.6 strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | Catch the boring bugs at the compiler. |
| 4  | Validation                          | Zod, shared schemas server+client                                 | Single source of truth; works at the boundary and the form. |
| 5  | Forms                               | react-hook-form + zod resolver                                    | Smaller than alternatives, plays well with shadcn. |
| 6  | Mutations                           | Server Actions only for app traffic                               | Type safety end-to-end without tRPC. /api stays for inbound webhooks + REST API. |
| 7  | Public REST                         | `POST /api/v1/articles` only (bearer token)                       | Power-user + shortcuts.app integrations. Not for the app's own UI. |
| 8  | Database                            | Postgres 16 via Drizzle                                           | Typed migrations, SQL escape hatch, vector + FTS in one engine. |
| 9  | Solo self-host DB                   | SQLite toggle via `DATABASE_DRIVER=sqlite\|postgres`              | Drizzle abstracts; pgvector-only features (semantic search) degrade gracefully. |
| 10 | Search engine                       | Postgres FTS (tsvector + pg_trgm) — no Algolia / Meilisearch      | At sub-100k article scale, the latency and operational cost don't justify another service. See ADR-0001. |
| 11 | Embeddings primary                  | Voyage AI (`voyage-3.5`)                                          | Cheapest high-quality option; permissive licensing. |
| 12 | Embeddings fallback                 | OpenAI `text-embedding-3-small`                                   | Switches via env flag if Voyage rate-limits or is down. |
| 13 | Vector store                        | pgvector with `ivfflat` index                                     | One database to back up. Re-evaluate if recall drops below 0.9 on 100k+ vectors. |
| 14 | LLM provider for summaries          | Anthropic `claude-haiku-4-5-20251001` via `@anthropic-ai/sdk`     | Best price/quality for short summarization + tagging in 2026. |
| 15 | Streaming                           | Anthropic SDK streaming → Server Action → Suspense boundary       | Avoids exposing a `/api/stream` and re-authing. |
| 16 | Auth                                | Better-Auth                                                       | Owns its DB, plays with Drizzle, magic link + OAuth + bearer tokens. See ADR-0003. |
| 17 | Auth methods                        | Email magic link + GitHub OAuth + Google OAuth (optional)         | Magic link is the floor; OAuth for convenience. |
| 18 | API tokens                          | Bearer tokens via Better-Auth's API plugin                        | Scoped, revocable, hashed-at-rest. |
| 19 | Queue                               | BullMQ + Redis                                                    | Self-host parity — no Inngest dependency. See ADR-0005. |
| 20 | Email                               | Resend + react-email                                              | Transactional + weekly digest + inbound email-to-save in one provider. |
| 21 | Email-to-save                       | Resend inbound webhook → `/api/webhooks/email` (edge runtime)     | Each user gets `save+{uuid}@tide.example`. |
| 22 | Archive HTML storage                | Cloudflare R2 (S3-compatible)                                     | Egress-free reads; MinIO is the self-host fallback. |
| 23 | Extraction                          | `@mozilla/readability` + `jsdom` (server-side only)               | Battle-tested; one library to keep current. |
| 24 | Extraction edge cases               | Site-specific overrides (substack, medium, paywall heuristics)    | Snapshot tests pinned to 10 real fixtures. |
| 25 | Public sharing                      | Per-article opt-in toggle → `/s/[slug]` (PPR static)              | No social graph; just shareable links. |
| 26 | Rate limiting                       | Upstash Ratelimit on save endpoint, per-user + per-IP             | Cheap, works at the edge. |
| 27 | Idempotency                         | Dedupe on `(user_id, sha256(canonical_url))`                      | Saving the same URL twice is a no-op + bring-to-top. |
| 28 | Optimistic UI                       | Save: instant ack with placeholder. Highlight: instant local render. | Capture has to feel synchronous even when extraction is async. |
| 29 | SSE                                 | `/api/sse/notifications` for "summary done" / "extract failed"    | Single channel, fanned out via Redis pub/sub. |
| 30 | Reader theming                      | oklch palette (light / dark / sepia), serif / sans / mono, 4 sizes, 3 widths | Typography is the product. |
| 31 | Listen mode                         | `speechSynthesis` (browser TTS) with per-paragraph controls       | Free, offline, good enough. ElevenLabs as a v2 paid feature. |
| 32 | Bionic reading                      | Toggle (experimental flag), bolds first half of each word         | Cheap delight feature. |
| 33 | Progress sync                       | Debounced scroll position → server action → restore on next open  | 1s debounce; no jitter. |
| 34 | Browser extension                   | Manifest V3, Chrome + Firefox, single codebase via webextension-polyfill | Lives at `packages/extension/`. |
| 35 | Mobile capture                      | PWA with Web Share Target API                                     | iOS Safari adds it to the Share Sheet. No native app. |
| 36 | Demo                                | Hosted at `tide.mateokadiu.com` (Vercel for the demo node)        | Designed for Oracle Cloud Free as primary self-host target. |
| 37 | CI                                  | GitHub Actions — typecheck + lint + test + build + Lighthouse     | Lighthouse audit runs on PR with score floor. |
| 38 | Lint                                | Biome                                                             | Faster than ESLint+Prettier; single config. |
| 39 | Unit + integration tests            | Vitest                                                            | Fast, ESM-native, Jest API compatible. |
| 40 | E2E tests                           | Playwright                                                        | Covers the full save → read → highlight → search → AI flow. |
| 41 | Extraction snapshot tests           | 10 fixtures pinned in `apps/web/tests/fixtures/extract/`          | NYT, Substack, dev.to, Medium, Wikipedia, GitHub README, BBC, ArXiv, paywall, SPA. |
| 42 | Performance budget                  | Lighthouse mobile 95+ / desktop 100. Save endpoint p99 < 200ms.   | Published in `docs/performance.md` with autocannon results. |
| 43 | A11y                                | Keyboard-only navigation, screen-reader tested on save+read+highlight | WCAG AA target. |
| 44 | Standalone build                    | `pnpm build:standalone` → Next.js standalone + SQLite + local FS  | Single Node 22 process, no Docker required. |
| 45 | Docker self-host                    | `infra/docker/docker-compose.yml` — app + pg + redis + minio + traefik | One-command bring-up, TLS via Let's Encrypt. |
| 46 | Cloud self-host                     | `infra/pulumi/` recipe targeting Oracle Cloud Always-Free         | 1× Ampere A1 VM + Autonomous DB free tier + 10GB object storage. |
| 47 | SDK                                 | `packages/sdk` — typed client for `/api/v1/*`                     | Used by shortcuts.app integrations and third-party tools. |
| 48 | Backups                             | Nightly `pg_dump` → object storage (R2 or self-host bucket)       | 30-day rolling retention by default. |

## 6. Phase order

Implementation follows the phases below — each phase is shippable on its own.

1. **Scaffold** — pnpm workspace, Next.js 16, Tailwind, Biome, CI.
2. **DB + Auth** — Drizzle schema, dual-driver, Better-Auth.
3. **Extraction** — Readability adapter, snapshot tests, archive-to-storage job.
4. **Capture surfaces** — save action, REST API, browser extension, PWA, email.
5. **Reader** — RSC page, typographic controls, highlights, progress sync, listen.
6. **AI** — Anthropic summary streaming, embeddings, semantic search, weekly digest.
7. **Search + UI polish** — FTS + trigram, library views, settings, sharing.
8. **Self-host + infra** — Docker Compose, Pulumi, standalone build, SDK.
9. **Tests + quality** — Vitest, Playwright, autocannon, ADRs, docs.
10. **Demo + release** — seed, screenshots, README, Lighthouse audit, v0.1.0 tag.

## 7. Risk register

| Risk | Mitigation |
| ---- | ---------- |
| Paywalled sites break extraction. | Snapshot test pinned to a paywall fixture; site-specific override registry; archived HTML stored even on partial extract. |
| LLM provider outage during AI summary. | Summary is on-demand; failure surfaces as a toast and a retry button. Embedding pipeline retries via BullMQ; fallback to OpenAI is one env var. |
| pgvector recall drops at 100k+ vectors. | Re-index with HNSW (Postgres 16 supports it via pgvector 0.7+) before swapping store. |
| Oracle Cloud Always-Free trims capacity. | Docker Compose path runs on any 1-vCPU/1GB VPS for $5/mo. |
| Self-hoster forgets to set rate limit envs. | Sane defaults baked in; loud warning at boot if Upstash creds are absent and the deployment is public. |

## 8. Versioning

`v0.1.0` ships the scope above. Semver from there; breaking schema changes
get a migration script and a release-notes entry.
