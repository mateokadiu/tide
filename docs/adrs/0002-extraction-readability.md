# ADR-0002 — Extraction uses `@mozilla/readability` + `jsdom`, server-side only

- **Status**: accepted
- **Date**: 2026-01-25
- **Context**: We need to turn an arbitrary URL into clean article HTML and
  text. Options: Readability, `defuddle`, custom parsers, browser-side via the
  extension, headless Chromium, third-party APIs (Diffbot, Mercury Parser).

## Decision

Server-side only. `@mozilla/readability` over a `jsdom` document, with:

- A noise pre-pass that strips obvious ad/newsletter/subscribe blocks
  before Readability sees them.
- A `<noscript>` promotion pass for SSR-into-noscript SPAs.
- A site-override registry (Substack, Medium, NYT, paywall heuristics) that
  can override `charThreshold`, `dropSelectors`, and the title extractor.
- Snapshot tests pinned to 10 real fixtures: NYT, Substack, dev.to, Medium,
  Wikipedia, GitHub README, BBC, ArXiv, paywall, SPA.

## Why not browser-side extraction

- **Paywall asymmetry.** The user's browser may have a cookie or a JS
  challenge passed; server fetch may not. We deal with the gap centrally
  (overrides + archive-html job) rather than asking the extension to.
- **Archival HTML.** We store the original HTML in object storage (R2 /
  MinIO / local) so we can re-extract. That HTML has to be the canonical one,
  not the variant in the user's browser.
- **Maintenance.** One extraction path is easier to keep working than two.

## Why not headless Chromium

The 1-vCPU/1GB self-host target rules out Puppeteer. Chromium-based extraction
is a v2 question for SPA-heavy sites if the `<noscript>` promotion + override
heuristics start failing on a meaningful share of saves.

## Why not Diffbot / Mercury

Vendor lock for a feature that should be local. Mercury Parser is
unmaintained. Diffbot is good but per-call pricing is wrong for a self-host
project; the whole point is the user pays once for hosting.

## Snapshot-pinned fixtures

`apps/web/tests/fixtures/extract/` holds the 10 real fixtures. The test
asserts a minimum word count and a title regex per fixture rather than a
byte-exact snapshot — the latter would fan out into every dependency bump.
The paywall fixture is the one place where we assert the `paywall_hit` code
path.

## Re-evaluation triggers

- Extraction recall on the snapshot set drops below 8/10 after a Readability
  bump.
- A meaningfully large class of sites (e.g. all of Substack) regresses; that's
  an override entry, not an architecture change.
