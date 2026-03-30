---
title: Observability Docs Index
description: Map for the local observability harness, telemetry signals, and query contracts.
updateAt: 2026-03-30
---

# How To Use

- Use this domain for work under [`src/lib/observability`](../../src/lib/observability), [`src/app/api/metrics/route.ts`](../../src/app/api/metrics/route.ts), [`src/app/api/observability/journey/route.ts`](../../src/app/api/observability/journey/route.ts), [`instrumentation.ts`](../../instrumentation.ts), [`scripts/stack-up.sh`](../../scripts/stack-up.sh), [`scripts/stack-down.sh`](../../scripts/stack-down.sh), and [`scripts/readme-smoke.js`](../../scripts/readme-smoke.js).
- Read the subdomain docs before changing stack lifecycle, emitted signals, or query wrappers.

# Subdomains

- [stack](./stack.md): Consult when changing stack bootstrap, per-worktree isolation, storage, or teardown.
- [signals](./signals.md): Consult when changing logs, metrics, traces, canonical journeys, or telemetry field names.
- [query-contract](./query-contract.md): Consult when changing query wrappers, filter shapes, or normalized query result formats.
