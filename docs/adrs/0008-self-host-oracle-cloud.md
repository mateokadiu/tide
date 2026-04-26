# ADR-0008 — Cloud self-host targets Oracle Cloud Always-Free

- **Status**: accepted
- **Date**: 2026-02-26
- **Context**: We need a default cloud self-host recipe. The constraint is
  cost: ideally the recipe runs at zero ongoing cost so the demo node is
  best-effort and any reader can stand up their own without a budget.

## Decision

Oracle Cloud Always-Free, deployed via a Pulumi-TS recipe at
`infra/pulumi/`. The recipe provisions:

- 1× Ampere A1 VM (4 OCPU / 24 GB RAM allocation, sized down to 2 OCPU /
  12 GB to leave headroom for other tenants on the account).
- 1× Block volume for `/var/lib/tide/{postgres,redis,minio,archive}`.
- Always-Free Object Storage bucket for backups (R2 if the user has CF).
- A `cloud-init` user-data that pulls the Docker Compose stack and brings it
  up under Traefik with Let's Encrypt.

DNS is BYO; the recipe outputs the public IP and the user points an A record
at it.

## Why Oracle Cloud (over Fly / Render / DO / Hetzner)

- **Always-Free truly free.** 4 OCPU / 24 GB RAM on Ampere is the largest
  always-free compute tier in the public cloud market as of 2026.
- **Tenancy.** Other free tiers (DO $200 credit, Hetzner trial) lapse. Oracle's
  doesn't.
- **The recipe is reproducible.** Pulumi-TS lets us version-control the
  exact shape; users can fork it and target AWS Lightsail or Hetzner with
  one provider swap. Documented in [PLAN.md §5 row 46](../../PLAN.md).

## Why not Fly / Render

Both are excellent for SaaS-style deploys. Neither is a fit for an OSS
self-host product where the recipe needs to keep working without the user
having a credit card on file with the platform.

## Why not Kubernetes

Out of scope for a single-tenant read-later. We need one VM, one
docker-compose, one TLS cert. K8s would multiply both the cost and the
maintenance burden without buying anything we use.

## The docker-compose path is the source of truth

`infra/pulumi/` is a convenience wrapper. The canonical self-host recipe is
`infra/docker/docker-compose.yml`. The Pulumi recipe boots a VM, then runs
`docker compose up -d` against the same file. If the compose file works
locally, it works on the cloud node.

## Re-evaluation triggers

- Oracle changes its Always-Free policy meaningfully.
- A new always-free tier emerges with materially better specs.
- We need a multi-region self-host story (out of scope per
  [PLAN.md §3](../../PLAN.md)).
