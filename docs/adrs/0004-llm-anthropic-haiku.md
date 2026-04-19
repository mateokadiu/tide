# ADR-0004 — LLM provider for summaries: Anthropic Claude Haiku 4.5

- **Status**: accepted
- **Date**: 2026-02-04
- **Context**: We need a small-to-medium LLM for two surfaces: on-demand
  article summaries (streamed) and auto-tagging (1-3 tags, JSON output).

## Decision

Anthropic `claude-haiku-4-5-20251001`, accessed via `@anthropic-ai/sdk`. The
model id is pinned in env (`ANTHROPIC_MODEL`); we don't accept a "latest"
alias because we have specific token-count and latency assumptions baked in
upstream of the summarizer.

For summaries: SDK streaming → server action → React Suspense boundary in the
reader footer. No `/api/stream` endpoint; the auth context stays in the server
action.

For tagging: non-streaming, max 80 tokens, JSON array, parsed defensively.

## Why Haiku 4.5

- **Price.** Cheapest option in the Anthropic line at our quality bar in
  early 2026.
- **Latency.** 3-sentence summaries return in well under 1.5s on a normal-sized
  article, with the first token in well under 400ms. Streaming makes it feel
  even faster.
- **Refusal profile.** Haiku rarely refuses summarisation tasks. Tagging is
  deterministic enough that we get clean JSON ~99% of the time; we fall back
  to "no tags" on parse failures.

## Why not OpenAI / Gemini

- Different refusal profiles for paywalled-by-quote excerpt summarisation.
- We already use `text-embedding-3-small` as the embeddings fallback. Going
  multi-provider for both summaries and embeddings simultaneously is twice
  the surface area; the embedding provider is the one with the higher
  rate-limit risk (per ADR-0005), so we keep the swappable seam there.

## Cost model

Summaries are on-demand only — never on save. Tagging fires on extract only
when `ANTHROPIC_API_KEY` is set. At Haiku pricing (early 2026), a heavy reader
(~50 articles/week) generates < $0.40 / month of LLM cost. The self-hoster
sees the cost on their own bill.

## Prompt design

The summary prompt enforces:
- 3 sentences. Active voice.
- First sentence: concrete claim. Second: key evidence/argument. Third:
  so-what.
- "Never invent details, attributions, or numbers not in the source."

The tagging prompt asks for a JSON array of at most 3 short, kebab-case,
topical tags. Generic tags ("technology", "news") are discouraged in the
system prompt.

## Re-evaluation triggers

- Anthropic deprecates Haiku 4.5 or its successor lands at meaningfully
  better price/quality.
- Refusal rate on summarisation crosses 1% in production.
- A self-hoster surveys ask for a local model. (Out of scope per
  [PLAN.md §3](../../PLAN.md); pluggable is a v2 question.)
