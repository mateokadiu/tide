# Security policy

## Supported versions

`v0.1.x` is the only line that currently receives security updates.

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✓         |
| < 0.1   | ✗ (no public releases)         |

## Reporting a vulnerability

If you've found something you think is exploitable, please **do not**
open a public GitHub issue.

Email `mateokadiu17@gmail.com` with:
- A short description of the issue
- The minimal reproduction (curl command, screenshot, or stack trace)
- Whether you think the issue is exploitable against a stock self-host
  install or only against a specific configuration

I'll acknowledge within 72 hours, agree on a fix timeline, and credit you
in the release notes unless you'd rather stay anonymous.

## Scope

In scope:
- The web app (`apps/web/`)
- The browser extension (`packages/extension/`)
- The SDK (`packages/sdk/`)
- The Docker Compose recipe (`infra/docker/`)
- The Pulumi recipe (`infra/pulumi/`)

Out of scope:
- Third-party services we integrate with (Anthropic, Voyage, OpenAI, Resend,
  Upstash, Cloudflare R2, Oracle Cloud). Report to them.
- Vulnerabilities that require a malicious admin already authenticated to the
  self-host install (e.g. "an admin can wipe their own data" is not a
  finding).

## Threat model (high level)

tide is single-tenant per self-host. The threat actors we design against:

- **Random anonymous traffic.** Web crawlers, mass-scan bots. Mitigated by
  rate-limiting (Upstash or in-process) on the save endpoint per-IP and
  per-user; CSRF on server actions (Better-Auth + same-site cookies); strict
  Content-Type, Referrer-Policy, X-Frame-Options, Permissions-Policy headers.
- **Authenticated attacker against another user.** All queries are scoped
  on `(user_id = current_user.id)`. There is no admin role, no
  cross-account view, and the public-share path requires the article owner
  to opt in per article.
- **Malicious page extraction.** All archived HTML is sanitised through
  DOMPurify on the server before render. Inline event handlers and
  `<script>` / `<iframe>` are stripped. We never `eval` extracted content.
- **Token leak.** API tokens are stored as sha256 hashes; the plaintext is
  shown once at mint and never persisted. Tokens are scoped (`articles:read`,
  `articles:write`) and revocable from `/settings`.

## What I'm watching

- pgvector / Readability / Better-Auth / Next.js security advisories.
- Resend inbound webhook signature spec changes — we verify against the
  documented HMAC-SHA256 contract.
- Any CVE on the multi-arch base images we publish.

— Mateo
