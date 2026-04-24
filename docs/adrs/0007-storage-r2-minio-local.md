# ADR-0007 — Archive HTML storage: R2 primary, MinIO + local FS fallbacks

- **Status**: accepted
- **Date**: 2026-02-18
- **Context**: We store the original HTML of every saved article so we can
  re-extract on demand (Readability bumps, site-override fixes, paywall
  bypass attempts). At ~30KB / article, a heavy user is < 200MB / year.

## Decision

S3-compatible object storage abstracted through `lib/storage/`. Three
drivers selected via `STORAGE_DRIVER`:

- **`r2`** (Cloudflare R2): primary for the hosted demo node and anyone with
  a Cloudflare account. Egress-free reads.
- **`minio`**: for the docker-compose self-host. Comes up in the same
  `docker-compose.yml` as Postgres + Redis.
- **`s3`**: any S3-compatible provider (Backblaze B2, Wasabi, AWS S3, etc).
- **`local`**: writes to `STORAGE_LOCAL_DIR` on the local filesystem. Used by
  the single-binary build and by `pnpm dev` out of the box.

All four go through the same `ObjectStore` interface (`put` / `get`); the
caller never knows which driver is in use.

## Why R2 over AWS S3

- Egress-free reads. We never charge a user to view a re-extraction.
- Standard S3 API → migration to/from S3 is a credentials change.
- Cheap PUT. The archive job fires on every save.

## Why MinIO for self-host

MinIO matches the R2 / S3 API exactly. The same code path works in both
environments. Self-hosters with an existing S3 bucket can point at it
without running MinIO — `STORAGE_DRIVER=s3` + endpoint.

## Backups

`infra/scripts/backup.sh` does a nightly `pg_dump` + `mc cp` (MinIO client)
to the same archive bucket under `backups/`. Rolling 30-day retention via
lifecycle policy. For R2: the same script runs, writing to a separate
`tide-backups` bucket.

## Re-evaluation triggers

- R2 changes its pricing model meaningfully.
- We start storing images alongside HTML (currently we store the URL only;
  the image lives at the source). If that changes, we re-evaluate storage
  shape, not the driver abstraction.
