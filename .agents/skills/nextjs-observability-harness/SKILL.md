---
name: nextjs-observability-harness
description: "Use when bootstrapping or repairing a demo-style Next.js App Router observability harness in a fresh repo, with VictoriaLogs, VictoriaMetrics, VictoriaTraces, stack lifecycle scripts, and lightweight runtime validation."
---

# Next.js Observability Harness

## Overview

Build a local evidence loop so agents can prove behavior with logs, metrics, and traces instead of terminal output. Use it for fresh or instrumented repos. Stack scripts are convenience entrypoints, not the goal.

## Rules

- Read the repository before proposing changes.
- Read the local Next.js instrumentation docs in `node_modules/next/dist/docs/` before editing `instrumentation.ts` or App Router entry points.
- Explain VictoriaLogs, VictoriaMetrics, and VictoriaTraces before editing.
- Prefer repo-local stack binaries under `.observability/bin` when present; do not assume system-installed Victoria binaries.
- Use any stable local orchestration method that yields real evidence; do not over-center `stack-up.sh`.
- Stop after the boundary discussion and wait for approval on net-new scaffold work or visible architectural changes.
- Run the bundled validator before repo-native checks.
- Default to `npm run dev` for local runtime proof unless the developer explicitly asks for production-mode verification.

## Workflow

1. Inspect the repository.
   - Read `package.json`, `README*`, local telemetry docs, and detect existing logs, metrics, traces, or stack scripts.

2. Explain the harness.
   - Describe each backend and the proof loop: bring services up, emit signals, query the backends, accept or reject the change.
   - Use [references/scaffold-spec.md](./references/scaffold-spec.md) for the default layout and signal contract.

3. Gate implementation.
   - List the files you expect to create or edit.
   - Call out missing prerequisites such as repo-local binaries if full proof depends on them.
   - Mark path deviations and separate `required` from `optional` changes.

4. Implement the scaffold.
   - Keep `instrumentation.ts`, `src/lib/observability/*`, `src/app/api/*`, and `scripts/*` as separate concerns unless the repo already enforces a different layout.
   - Keep log payloads flat.

5. Validate in layers.
   - Always run:
     - `node scripts/validate-harness.js --repo /absolute/path/to/repo`
   - If the app can run, also run:
     - `node scripts/validate-harness.js --repo /absolute/path/to/repo --app-url http://127.0.0.1:3000`
   - If the repository uses different paths, pass a JSON override file with `--layout`.
   - For local harness acceptance, prefer `npm run dev` over `npm start` unless the developer asked for production-mode proof.
   - Use repo scripts when they help, but do not block on `stack-up.sh` if another stable method can produce the same evidence.
   - Run build, test, or smoke scripts only after the bundled validator passes.
   - Before final handoff, run one real end-to-end proof across VictoriaLogs, VictoriaMetrics, and VictoriaTraces using a concrete startup signal or journey.
   - Report the evidence source for each backend; terminal output alone is not acceptance.

6. Hand off.
   - Summarize approved scope, files changed, validation commands, and status.
   - State whether end-to-end proof is full acceptance or partial acceptance.
   - Include one follow-up acceptance prompt another agent can run.

## Resources

- Read [references/scaffold-spec.md](./references/scaffold-spec.md) for the file map and signal contract.
- Read [references/acceptance-playbook.md](./references/acceptance-playbook.md) for boundary, orchestration, and acceptance patterns.
- Read [references/example-prompts.md](./references/example-prompts.md) for prompts.
- Use [scripts/validate-harness.js](./scripts/validate-harness.js) for the lightweight validator.
