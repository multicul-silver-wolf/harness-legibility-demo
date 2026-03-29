---
title: Observability Stack
description: Stable notes for stack bootstrap, isolation, and teardown.
updateAt: 2026-03-30
---

# Scope

- Covers [`scripts/stack-up.sh`](../../scripts/stack-up.sh), [`scripts/stack-down.sh`](../../scripts/stack-down.sh), and [`src/lib/observability/stack-context.ts`](../../src/lib/observability/stack-context.ts) / [`stack-bootstrap.ts`](../../src/lib/observability/stack-bootstrap.ts).
- Focuses on per-worktree storage, service identity, and the local VictoriaLogs, VictoriaMetrics, and VictoriaTraces stack.

# Current Subdomain Docs

- `scripts/stack-up.sh` derives a deterministic `stack_id` from the current worktree path, creates `.observability/<stack-id>`, and writes an env file for the current checkout.
- The stack runs three local backends on fixed ports: VictoriaLogs on `10528`, VictoriaMetrics on `18428`, and VictoriaTraces on `11428`.
- V1 wires the app directly to the Victoria services: logs ingest into VictoriaLogs, metrics are scraped from `/api/metrics` by VictoriaMetrics, and traces export directly to VictoriaTraces.
- Stack storage, PID files, and process logs are isolated under `.observability/<stack-id>` so each worktree can be started and torn down independently.
- `scripts/stack-down.sh` stops the known backend processes and removes the worktree storage directory.
- `stack-context.ts` is the canonical place for deriving the stack identity and backend endpoint URLs used by app code.

# Update Triggers

- Update this file when stack bootstrap, ports, storage layout, or identity derivation changes.
- Update this file when a new local backend is added to the worktree stack or teardown semantics change.
