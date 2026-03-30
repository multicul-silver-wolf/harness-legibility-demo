---
name: nextjs-observability-harness
description: "Scaffold, extend, or repair a Next.js App Router observability harness modeled on this repository: VictoriaLogs for structured logs, VictoriaMetrics for Prometheus-style metrics, VictoriaTraces for OTLP and Jaeger-compatible traces, stack lifecycle scripts, runtime query helpers, and lightweight validation. Use when an agent needs to initialize this harness in a new Next.js repository, maintain an existing harness, discuss telemetry scope and file changes before editing, validate the scaffold without relying on Vitest, or provide acceptance prompts that prove changes with runtime evidence instead of terminal output alone."
---

# Next.js Observability Harness

Build a reusable runtime-evidence loop for a Next.js repository so agents can prove changes with logs, metrics, and traces instead of terminal output alone.

## Follow This Workflow

1. Inspect the target repository before proposing changes.
   - Read `package.json`, `README*`, and any local docs that describe telemetry, scripts, or acceptance flows.
   - If `node_modules/next/dist/docs/` exists, read `01-app/02-guides/instrumentation.md` and `01-app/03-api-reference/03-file-conventions/instrumentation.md` before editing `instrumentation.ts` or any App Router entry point.
   - Detect whether the repository already has logs, metrics, traces, or startup scripts; preserve working pieces instead of replacing them blindly.

2. Explain the harness in developer terms before touching files.
   - Describe the role of each tool in one sentence:
     - VictoriaLogs stores structured application events.
     - VictoriaMetrics stores Prometheus-style counters and durations.
     - VictoriaTraces stores OTLP spans and exposes a Jaeger-compatible query surface.
   - Explain the proof loop you are about to add: boot stack, emit signals from real routes, query backends, then accept or reject a change.
   - Point to [references/scaffold-spec.md](./references/scaffold-spec.md) for the default layout and signal contract.

3. Gate implementation with a boundary discussion.
   - List the files you expect to create or edit before making changes.
   - Call out any deviations from the default layout in [references/scaffold-spec.md](./references/scaffold-spec.md).
   - Wait for explicit developer approval before editing when the request is net-new scaffold work or a visible architectural change.
   - If the developer wants different directories, capture the agreed paths and use them consistently in code, docs, and validation.

4. Implement the scaffold in small, explainable slices.
   - Keep the stack lifecycle scripts, runtime instrumentation, telemetry helpers, API routes, and query helpers separate instead of collapsing them into one file.
   - Preserve App Router conventions and keep `instrumentation.ts` at the project root unless the target repository already uses `src/instrumentation.ts`.
   - Keep log payloads flat and stable so query surfaces stay agent-friendly.
   - Prefer explicit helper modules for journeys, metrics, traces, runtime recording, stack context, and stack bootstrap rather than inlining everything into route handlers.

5. Run validation in escalating layers.
   - Always run the bundled validator first:
     - `node scripts/validate-harness.js --repo /absolute/path/to/repo`
   - If the app is runnable, add the runtime pass:
     - `node scripts/validate-harness.js --repo /absolute/path/to/repo --app-url http://127.0.0.1:3000`
   - If the repository uses non-default paths, write a small JSON override file and pass it with `--layout`.
   - If the target repository already has richer validation such as Vitest, build checks, or smoke tests, run them after the bundled validator instead of replacing the lightweight pass.

6. Hand off with agent-usable acceptance prompts.
   - Provide at least one prompt that asks another agent to use the harness to prove a change with runtime evidence.
   - Keep prompts concrete and observable: startup proof, canonical journey replay, structured log audit, or regression proof after a code change.
   - Use [references/acceptance-playbook.md](./references/acceptance-playbook.md) for prompt patterns and reporting structure.

## Default Scaffold

Use the default file layout and contract in [references/scaffold-spec.md](./references/scaffold-spec.md) unless the developer asks for different directories.

## Validation Rules

- Treat the bundled validator as the minimum acceptance bar for every scaffold or maintenance task.
- Use static validation when the environment cannot run app tests yet.
- Use runtime validation when the app can boot, even if Victoria binaries are unavailable; the metrics route and journey route should still prove the harness wiring.
- Report which validation layers ran, which were skipped, and why.

## Reporting Rules

- Summarize the developer-approved scope first.
- List the actual files created or changed.
- Report validator results and any additional tests you ran.
- Include at least one ready-to-run acceptance prompt for another agent.

## Resources

- Read [references/scaffold-spec.md](./references/scaffold-spec.md) for the recommended file map, signal names, and stack contract.
- Read [references/acceptance-playbook.md](./references/acceptance-playbook.md) for boundary-discussion prompts, layout override patterns, and acceptance examples.
- Read [references/example-prompts.md](./references/example-prompts.md) for realistic user-style prompts that initialize, extend, and validate the harness in a new repository.
- Use [scripts/validate-harness.js](./scripts/validate-harness.js) for the lightweight reusable validator.
