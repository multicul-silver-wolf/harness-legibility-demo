---
title: Project Docs System
description: Cross-domain durable knowledge for the harness-legibility-demo repository.
updateAt: 2026-03-30
---

# How To Use

- Start here for repository-wide conventions that apply across features and docs domains.
- Pair this file with [.docs/index.md](./index.md) when deciding where to look next.
- Keep one-off debugging notes out of this file; only store reusable project knowledge.

# Repository-Wide Conventions

- The repository is a local observability harness paired with a colocated Vitest/TDD homepage; use [`scripts/stack-up.sh`](../scripts/stack-up.sh) and [`scripts/stack-down.sh`](../scripts/stack-down.sh) to manage the per-worktree observability stack.
- Worktree-specific observability state lives under [`.observability/<stack-id>`](../.observability); `STACK_ID` and `WORKTREE_ID` isolate logs, metrics, and traces per checkout.
- Shared telemetry code lives under [`src/lib/observability`](../src/lib/observability), with [`instrumentation.ts`](../instrumentation.ts), [`src/app/api/metrics/route.ts`](../src/app/api/metrics/route.ts), and [`src/app/api/observability/journey/route.ts`](../src/app/api/observability/journey/route.ts) as stable app-facing entry points.
- Runtime stack is `next@16.2.1` with `react@19.2.4` and `react-dom@19.2.4`; treat framework behavior as Next 16 specific.
- Package management is currently npm-based and the lockfile of record is [`package-lock.json`](../package-lock.json).
- Primary app code lives under [`src/app`](../src/app); this repository currently uses the App Router only.
- Styling starts in [`src/app/globals.css`](../src/app/globals.css) via `@import "tailwindcss"` and shared CSS custom properties.
- Unit and component tests are colocated with their targets using `*.test.ts` and `*.test.tsx` file names.
- The homepage now acts as a lightweight testing entry point that explains the Vitest workflow and renders a small interactive TDD cycle demo.

# Docs Rules

- Use [.docs/index.md](./index.md) to discover first-level domains.
- Keep cross-domain conventions here and move feature-specific notes into `.docs/<domain>/<subdomain>.md`.
- Update the relevant map files in the same change whenever docs files are added, renamed, or removed.
