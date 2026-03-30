# Harness Legibility Demo

A production-minded local **agent validation harness** built with Next.js.

This repo demonstrates one core idea from harness engineering:

> Don’t trust terminal output alone. Let agents prove correctness using runtime evidence (logs, metrics, traces).

---

## Why this exists

Most coding agents can change code. Fewer can **verify** that their change is correct in runtime.

This demo gives you a minimal but complete playground where an agent can:

1. run the app,
2. trigger canonical user journeys,
3. query telemetry backends,
4. decide if the system is healthy after a change.

If you are building agentic dev workflows, this is the missing “proof layer”.

---

## What’s inside

### App layer
- Next.js app (App Router)
- Demo UI with deterministic interaction flows
- Canonical journey events:
  - `home.initial_load`
  - `demo.component_interaction`
  - `diagnostics.view`
  - `action.submit`

### Observability layer
- **VictoriaLogs** for structured logs
- **VictoriaMetrics** for Prometheus-style metrics
- **VictoriaTraces** for OTLP traces + Jaeger query API

### Harness scripts
- `scripts/stack-up.sh` — boot local telemetry stack for current worktree
- `scripts/stack-down.sh` — stop stack + clean stack storage
- `npm run smoke:readme` — reproducible README smoke scenario

---

## Architecture (mental model)

```text
Agent/Human
   │
   ├─ interacts with Next.js demo routes/UI
   │
   ├─ emits structured logs ───────────────► VictoriaLogs
   ├─ emits metrics (/api/metrics scrape) ─► VictoriaMetrics
   └─ emits OTLP traces ───────────────────► VictoriaTraces

Verification loop:
change → run journeys → query logs/metrics/traces → accept/reject change
```

This is the whole point: **agent-readable evidence loop**.

---

## Prerequisites

- Node.js 20+
- npm
- Local Victoria binaries available in PATH:
  - `victoria-logs` (or `victoria-logs-prod`)
  - `victoria-metrics` (or `victoria-metrics-prod`)
  - `victoria-traces` (or `victoria-traces-prod`)

> You can also point to custom binary paths via env vars (`VICTORIA_LOGS_BIN`, `VICTORIA_METRICS_BIN`, `VICTORIA_TRACES_BIN`).

---

## Quick Start

```bash
# 1) install deps
npm install

# 2) start local observability stack
./scripts/stack-up.sh

# 3) load generated env file (use the path printed by stack-up)
source .observability/<stack-id>/env

# 4) run app
npm run dev
```

Open `http://localhost:3000` and click through demo actions:
- `Advance cycle`
- `Reset to red`
- `Submit action`

Then validate runtime signals:

```bash
curl http://localhost:3000/api/metrics
```

---

## Reproducible smoke scenario

```bash
npm run smoke:readme
# or
npm run smoke:readme:verbose
```

This runs a deterministic sequence intended for harness validation and README-level regression checks.

---

## Useful query endpoints

- App metrics endpoint: `http://localhost:3000/api/metrics`
- Journey ingestion route: `http://localhost:3000/api/observability/journey`
- VictoriaLogs query: `http://127.0.0.1:10528/select/logsql/query`
- VictoriaMetrics query API: `http://127.0.0.1:18428/api/v1/query`
- VictoriaTraces Jaeger query API: `http://127.0.0.1:11428/select/jaeger/api/traces`

---

## Example prompts for coding agents

### Startup gate
```text
Boot the local stack and app, then verify startup latency is below 800ms using startup metric + startup trace. Do not infer from terminal output.
```

### Journey latency
```text
Run the canonical journeys and report the latest span duration for home.initial_load, demo.component_interaction, diagnostics.view, and action.submit. Flag any span over 2s with trace evidence.
```

### Structured logs check
```text
Inspect the latest logs for this stack and confirm each canonical journey has a valid structured event. Report any missing fields or error-level records.
```

### Regression proof
```text
After making your code change, prove the harness still emits startup telemetry, journey logs, journey metrics, and journey spans. Cite concrete query evidence.
```

---

## Quality gates

```bash
npm run test
npm run build
npm run smoke:readme
```

---

## Shut down

```bash
./scripts/stack-down.sh
```

---

## Who should use this

- Builders experimenting with coding agents / harness engineering
- Teams designing autonomous verification loops
- Anyone who wants agent changes to be backed by runtime evidence, not vibes

---

## License

MIT (inherited from repository settings if present).
