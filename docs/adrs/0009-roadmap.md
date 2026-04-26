# ADR-0009 — Roadmap beyond v0.1.0

- **Status**: living document
- **Date**: 2026-03-21
- **Context**: `v0.1.0` ships the spec in [PLAN.md](../../PLAN.md). Things
  punted to future versions deserve a single home.

## v1.1 — likely

- **RSS / Atom ingestion.** A user adds a feed → tide periodically polls →
  new items land in their library as `source = 'feed'`. Out of scope in v1
  because there's no good single way to dedupe across feeds + manual saves
  without bringing the URL canonicalization story up a level.
- **Pocket / Omnivore / Instapaper importers.** Now that v1 ships the REST
  API + bearer tokens, the import path is "iterate the export, POST to
  `/api/v1/articles`". A v1.1 should ship a dedicated CLI for it under
  `packages/cli`.
- **Readwise / Notion export.** Highlights flow out of tide → Readwise daily.
  Annotations export is the inverse of inbound; we already have all the
  structure server-side.

## v1.2 — possible

- **Listen mode v2 (ElevenLabs).** v1 uses `speechSynthesis`. ElevenLabs as
  a per-user toggle for a higher-quality voice. Paid only if the
  self-hoster connects an API key.
- **Mobile-native.** v1 is PWA-only. v2 considers a Tauri-on-mobile or
  React-Native shell that wraps the existing web app with native share
  sheet handling.

## v2.0 — open questions

- **Multi-tenant teams / shared libraries.** Out of scope per
  [PLAN.md §3](../../PLAN.md). The data model already namespaces by
  `user_id`; the v2 question is auth + billing + invites, not data.
- **Bring-your-own LLM provider beyond Anthropic / OpenAI / Voyage.** A
  pluggable seam in `lib/ai/` for local models (Ollama) or competitors. The
  refusal-profile + summary-quality validation matrix is the v2 cost.
- **Native desktop apps.** Tauri-based; out of scope for v1 because the PWA
  + extension cover the desktop story.

## Not on the roadmap

- iCal / calendar integration. Not a calendar product.
- Social graph / public profiles. Per-article sharing is enough.
- Paid plans / billing. The self-host model is the model.
