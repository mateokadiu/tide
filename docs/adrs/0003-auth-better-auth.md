# ADR-0003 — Auth: Better-Auth (over NextAuth / Lucia / Clerk)

- **Status**: accepted
- **Date**: 2026-01-28
- **Context**: We need email magic link, OAuth (GitHub + Google), and bearer
  tokens for the public REST API. Auth has to own its DB (no Clerk lock-in)
  and play with Drizzle (no NextAuth Prisma assumption).

## Decision

Better-Auth, with:

- `drizzleAdapter` against the same Postgres / SQLite we already use.
- The `magicLink` plugin, with the link delivery routed through our existing
  Resend integration (`lib/email/magic-link.tsx`).
- Optional GitHub + Google OAuth providers — enabled only if both
  `*_CLIENT_ID` and `*_CLIENT_SECRET` are present.
- A custom bearer-token table (`api_tokens`) for the public REST API.
  Hashed at rest (sha256). The plaintext token is shown once at mint.

## Why not NextAuth

- Adapter friction with Drizzle. Better-Auth's Drizzle support is native;
  NextAuth has historically pivoted around Prisma-shaped adapters.
- Magic link UX out-of-the-box without writing the email flow.
- The bearer-token primitive is a first-class concept, not a hand-rolled
  side path.

## Why not Lucia

Lucia is excellent at the session primitive, but every OAuth / magic-link
flow is hand-rolled on top of it. For a daily-driver app the cost of
maintaining that is not worth the flexibility.

## Why not Clerk / WorkOS

Self-host bar. We can't ship a self-hostable app whose auth layer is a SaaS.
A user signs up for tide and tide alone.

## Bearer tokens for the REST API

The public REST API (`POST /api/v1/articles`) and the SDK use bearer tokens
minted at `/settings`. The token format is `tide_pat_{base64url-nonce}` with
a `prefix` (first 16 chars) shown in the UI for revocation. The hash is
sha256 of the plaintext, never the plaintext itself. See
`lib/auth/api-token.ts`.

## Re-evaluation triggers

- Better-Auth abandons or drastically restructures the Drizzle adapter.
- We want SCIM / SAML for a v2 multi-tenant SKU. (Out of scope per
  [PLAN.md §3](../../PLAN.md).)
