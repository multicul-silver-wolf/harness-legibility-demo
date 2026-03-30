---
name: nextjs-observability-harness
description: "Use when initializing or repairing a demo-style Next.js App Router observability harness with VictoriaLogs, VictoriaMetrics, VictoriaTraces, stack lifecycle scripts, and lightweight runtime validation."
---

# Next.js Observability Harness

Build a local runtime-evidence loop for a Next.js repository so agents can prove behavior with logs, metrics, and traces instead of terminal output alone.

## Rules

- Read the target repository before proposing changes.
- Read the local Next.js instrumentation docs in `node_modules/next/dist/docs/` before editing `instrumentation.ts` or App Router entry points.
- Explain VictoriaLogs, VictoriaMetrics, and VictoriaTraces in developer terms before editing.
- Stop after the boundary discussion and wait for approval on net-new scaffold work or visible architectural changes.
- Run the bundled validator before repo-native checks.
- Report skipped validation layers and the reason.

## Workflow

1. Inspect the repository.
   - Read `package.json`, `README*`, and any local docs about telemetry or acceptance.
   - Detect whether logs, metrics, traces, or stack scripts already exist.

2. Explain the harness.
   - Describe the role of each backend.
   - Explain the proof loop: boot stack, emit runtime signals, query the backends, accept or reject the change.
   - Use [references/scaffold-spec.md](./references/scaffold-spec.md) for the default layout and signal contract.

3. Gate implementation.
   - List the files you expect to create or edit.
   - Mark path deviations from the default layout.
   - Separate `required` changes from `optional` surface changes when possible.

4. Implement the scaffold.
   - Keep `instrumentation.ts`, `src/lib/observability/*`, `src/app/api/*`, and `scripts/*` as separate concerns.
   - Preserve the default layout unless the repository already enforces a different one.
   - Keep log payloads flat and query-friendly.

5. Validate in layers.
   - Always run:
     - `node scripts/validate-harness.js --repo /absolute/path/to/repo`
   - If the app can run, also run:
     - `node scripts/validate-harness.js --repo /absolute/path/to/repo --app-url http://127.0.0.1:3000`
   - If the repository uses different paths, pass a JSON override file with `--layout`.
   - Run build, test, or smoke scripts only after the bundled validator passes.

6. Hand off.
   - Summarize approved scope, files changed, validation commands, and pass or fail status.
   - Include one follow-up acceptance prompt another agent can run.

## Resources

- Read [references/scaffold-spec.md](./references/scaffold-spec.md) for the recommended file map, signal names, and stack contract.
- Read [references/acceptance-playbook.md](./references/acceptance-playbook.md) for boundary discussion patterns, layout overrides, lint caveats, and acceptance examples.
- Read [references/example-prompts.md](./references/example-prompts.md) for realistic user-style prompts.
- Use [scripts/validate-harness.js](./scripts/validate-harness.js) for the lightweight validator.
