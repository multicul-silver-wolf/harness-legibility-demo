---
title: Frontend Testing
description: Durable notes for the colocated Vitest workflow in this repository.
updateAt: 2026-03-30
---

# Scope

- Covers unit and component testing conventions for files under [`src`](../../src).
- Applies to [`vitest.config.ts`](../../vitest.config.ts), [`vitest.setup.ts`](../../vitest.setup.ts), and colocated `*.test.ts(x)` files.

# Current Subdomain Docs

- The project uses Vitest with a `jsdom` environment so React components can be tested without a browser.
- Shared test setup lives in [`vitest.setup.ts`](../../vitest.setup.ts), which loads Next-style environment variables with `@next/env` and registers Testing Library matchers.
- Tests are colocated with the files they cover; prefer `feature.ts` with `feature.test.ts`, or `component.tsx` with `component.test.tsx` in the same directory.
- [`vitest.config.ts`](../../vitest.config.ts) resolves the `@/` alias to `src`, so tests can import app code the same way the application does.
- The demo pattern is [`src/app/components/tdd-cycle-demo.tsx`](../../src/app/components/tdd-cycle-demo.tsx) with [`src/app/components/tdd-cycle-demo.test.tsx`](../../src/app/components/tdd-cycle-demo.test.tsx).
- Use `npm run test` for a single pass and `npm run test:watch` for local red-green-refactor loops.
- The repository also has a slower acceptance layer through [`npm run smoke:readme`](../../package.json), which validates the README prompt contract against the running app and local observability stack rather than only checking isolated units.

# Update Triggers

- Update this file when the test runner, environment, or setup files change.
- Update this file when the repository adopts additional testing layers such as integration or end-to-end tests.
- Update this file when colocated test naming or placement conventions change.
