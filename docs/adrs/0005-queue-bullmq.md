# ADR-0005 — Background jobs: BullMQ + Redis (over Inngest / Trigger / pg-boss)

- **Status**: accepted
- **Date**: 2026-02-09
- **Context**: We need durable background jobs for extract, embed, tag,
  archive-html, and weekly-digest. The constraint is self-hosting parity:
  whatever we pick has to work behind one `docker compose up` on a small VM.

## Decision

BullMQ on Redis. One queue per job kind. Worker process is `pnpm worker`
(in `apps/web/lib/jobs/worker.ts`) and runs alongside the web process or as
its own container.

## Why not Inngest / Trigger.dev

Both are good. Both are SaaS-first. The self-host story for either is
materially behind the hosted version — and the hosted version is a recurring
bill that turns a self-host product into a hybrid product. Out per
[PLAN.md §3](../../PLAN.md).

## Why not pg-boss

pg-boss is a real alternative — single-DB story, no Redis. We chose Redis
anyway because:
- We need Redis for rate-limiting (Upstash-compatible) and SSE fan-out
  regardless. Adding pg-boss would add a second job substrate without
  reducing dependencies.
- BullMQ's per-job concurrency + delayed jobs + backoff API is what we need
  out of the box; pg-boss does it but with a less-ergonomic surface.
- For self-hosters who want to skip Redis, the single-binary path uses
  SQLite + in-process job execution (see `infra/docker/docker-compose.yml`
  and the standalone build).

## Concurrency

Concurrencies are tuned for a 1-vCPU/1GB target:

| Queue          | Concurrency | Rationale |
|----------------|-------------|-----------|
| extract        | 4           | I/O-bound (fetch + readability) |
| embed          | 6           | Mostly waiting on Voyage/OpenAI |
| tag            | 4           | Anthropic-bound, small payloads |
| archive-html   | 4           | S3 PUTs, throughput-bound |
| weekly-digest  | 1           | Per-user, runs once a week per user |

## Failure semantics

Every job has `attempts: 3` with exponential backoff (4s base) for retries.
Failures are logged + written to `notifications` (`extract.failed`,
`embed.failed`, …) and published to the SSE channel so the UI can surface
them without a page refresh.

## Re-evaluation triggers

- Redis becomes a real burden on self-hosters with sub-512MB nodes.
- A meaningful pgvector + pg-boss combination ships that gives us one engine
  for relational, vector, FTS, *and* jobs.
