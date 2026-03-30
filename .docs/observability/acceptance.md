---
title: Observability Acceptance
description: Durable notes for the executable README prompt suite and smoke-runner workflow.
updateAt: 2026-03-30
---

# Scope

- Covers [`README.md`](../../README.md), [`scripts/readme-smoke.js`](../../scripts/readme-smoke.js), and the public observability endpoints exercised by the smoke suite.
- Use this doc when changing the README example prompts, the end-to-end validation workflow, or the proof sources expected from logs, metrics, and traces.

# Current Subdomain Docs

- The README example prompts are treated as an executable acceptance contract, not only as documentation text.
- [`npm run smoke:readme`](../../package.json) is the canonical local entry point for running that contract, and `npm run smoke:readme:verbose` is the debugging variant.
- The smoke runner always manages its own local stack lifecycle first by calling [`scripts/stack-down.sh`](../../scripts/stack-down.sh) and then [`scripts/stack-up.sh`](../../scripts/stack-up.sh) before it builds and starts the app.
- Acceptance evidence must come from runtime signals rather than terminal output alone: startup checks require the startup metric and startup trace, while journey checks require matching logs, metrics, and spans.
- Canonical journey replay in the smoke suite uses the public [`/api/observability/journey`](../../src/app/api/observability/journey/route.ts) route rather than calling internal helper functions directly.
- The regression portion of the smoke suite temporarily edits [`src/app/page.tsx`](../../src/app/page.tsx) by replacing the exact sentence `instead of a separate test tree.` with `instead of a split test tree.`, then restores the file and rebuilds.
- Failures during stack bootstrap should surface the per-process excerpts under [`.observability/<stack-id>/process-logs`](../../.observability) so the runner reports why Victoria services did not come up.

# Update Triggers

- Update this file when README prompt wording changes in a way that changes what the smoke suite must prove.
- Update this file when the smoke runner changes how it boots the app, replays journeys, or collects evidence.
- Update this file when the regression edit target in `src/app/page.tsx` changes or moves.
