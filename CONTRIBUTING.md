# Contributing to tide

Thanks for considering a contribution. A few ground rules:

## Before you open a PR

- Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` locally. CI runs the
  same triple plus the Playwright suite and a Lighthouse audit.
- Keep changes focused. One PR per discrete change. PRs touching auth,
  extraction, or storage should reference the relevant ADR in
  `docs/adrs/` — and update / add an ADR if you're changing the
  underlying decision.
- Match the commit style: `<scope>: <imperative>`, lowercase, terse. See
  `git log` for examples.

## Things that need a discussion first

- Adding a new dependency. The bar is "we can't build this ourselves in
  a reasonable amount of code". Most of the time the answer is "yes, let's
  add it"; we just want the conversation in the issue tracker first.
- Changing one of the locked decisions in [PLAN.md](./PLAN.md). Open an
  ADR PR.
- Anything that introduces a third-party SaaS the self-hoster has to sign
  up for separately. (Anthropic, OpenAI, Voyage, Resend, Upstash, R2 are
  the existing exceptions, all gated behind env flags.)

## Setup

```bash
nvm use                 # node 22
corepack enable && corepack prepare pnpm@10 --activate
docker compose -f infra/docker/docker-compose.yml up -d postgres redis minio
pnpm install
pnpm db:migrate
pnpm seed:demo          # optional, populates demo@tide.example
pnpm dev                # web on :3000
pnpm --filter @tide/web worker   # background job worker (separate terminal)
```

## What goes where

```
apps/web                  next.js app
  app/                    routes + server actions
  components/             react components
  db/                     drizzle schema + migrations + seed
  lib/                    server-only helpers (auth, extract, ai, queue, …)
  tests/                  vitest unit + integration + extraction fixtures
  playwright/             playwright e2e

packages/extension        chrome + firefox MV3 extension
packages/sdk              typed REST client (`@tide/sdk`)

infra/docker              docker-compose stack
infra/pulumi              oracle cloud always-free recipe
infra/scripts             nightly backup, etc.
docs/adrs                 architecture decisions
```

## License

By contributing, you agree your contribution is licensed under the MIT
license (the same as the rest of the repo).
