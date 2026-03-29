---
title: Project Docs System
description: Cross-domain durable knowledge for the harness-legibility-demo repository.
updateAt: 2026-03-29
---

# How To Use

- Start here for repository-wide conventions that apply across features and docs domains.
- Pair this file with [.docs/index.md](./index.md) when deciding where to look next.
- Keep one-off debugging notes out of this file; only store reusable project knowledge.

# Repository-Wide Conventions

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
