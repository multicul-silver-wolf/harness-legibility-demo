# Example Prompts

Use these prompts when you want another agent to exercise the skill in a realistic way. They mirror the repository README style: concrete request, concrete evidence, and no reliance on terminal output alone.

## Developer Requests

Use these when a developer is asking an agent to design or modify the harness.

### Harness Initialization

```text
Use $nextjs-observability-harness to add the demo-style observability harness to this Next.js repository. Start by explaining what VictoriaLogs, VictoriaMetrics, and VictoriaTraces each do, then discuss the implementation boundary and list every file you plan to create or change before editing anything. After I approve, implement the scaffold and run the bundled lightweight validator.
```

### Fresh Repo With Local Binaries

```text
Use $nextjs-observability-harness to bootstrap the harness in this fresh Next.js repo. Keep any Victoria binaries inside this repository under .observability/bin instead of relying on machine-installed binaries. Explain the boundary first, wait for approval, then implement and validate.
```

### Custom Layout Initialization

```text
Use $nextjs-observability-harness to scaffold the observability harness in this repository, but keep observability source files under src/server/observability and put the public routes under src/app/api/internal. Explain how this differs from the default layout, confirm the file plan with me, then implement it and validate with a layout override file.
```

### Lightweight Validation Only

```text
Use $nextjs-observability-harness to review the current scaffold and run only the bundled lightweight validator. If the repository cannot run the app yet, report the static validation result, what runtime checks were skipped, and what the next acceptance step should be.
```

### Handoff Prompt

```text
Use $nextjs-observability-harness to finish this task with a handoff report that includes: the approved scope, files changed, validation commands run, skipped checks with reasons, and one follow-up acceptance prompt another agent can run.
```

## Acceptance Proof Requests

Use these when the scaffold already exists and another agent needs to prove it works with runtime evidence.

### Startup Gate

```text
Use $nextjs-observability-harness to boot the local stack and app, then verify startup latency is below 800ms using startup metric and startup trace evidence. Do not infer from terminal output.
```

### Journey Latency

```text
Use $nextjs-observability-harness to run the canonical journeys and report the latest span duration for home.initial_load, demo.component_interaction, diagnostics.view, and action.submit. Flag any span over 2s with trace evidence.
```

### Dev Server Three-Panel Proof

```text
Use $nextjs-observability-harness to boot the local stack, run this repo with npm run dev, and prove one real home.initial_load journey with concrete evidence from VictoriaLogs, VictoriaMetrics, and VictoriaTraces. Keep the proof tied to the active dev server, not a production build.
```

### Handoff Acceptance

```text
Use $nextjs-observability-harness to finish the task only after you personally run one real end-to-end proof across logs, metrics, and traces. Use a concrete startup signal or journey, tie the evidence together with a shared identifier, and report whether the result is full acceptance or only partial acceptance.
```

### Structured Logs Check

```text
Use $nextjs-observability-harness to inspect the latest logs for this stack and confirm each canonical journey has a valid structured event. Report any missing fields or error-level records.
```

### Regression Proof

```text
Use $nextjs-observability-harness after your code change and prove the harness still emits startup telemetry, journey logs, journey metrics, and journey spans. Cite concrete query evidence.
```
