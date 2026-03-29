---
title: Observability Signals
description: Stable notes for logs, metrics, traces, and canonical journey names.
updateAt: 2026-03-30
---

# Scope

- Covers [`src/lib/observability/journeys.ts`](../../src/lib/observability/journeys.ts), [`logger.ts`](../../src/lib/observability/logger.ts), [`metrics.ts`](../../src/lib/observability/metrics.ts), [`tracing.ts`](../../src/lib/observability/tracing.ts), [`runtime.ts`](../../src/lib/observability/runtime.ts), [`src/app/api/metrics/route.ts`](../../src/app/api/metrics/route.ts), [`src/app/api/observability/journey/route.ts`](../../src/app/api/observability/journey/route.ts), and [`instrumentation.ts`](../../instrumentation.ts).
- Use this doc when changing emitted field names, span attributes, metric names, or journey identifiers.

# Current Subdomain Docs

- Four canonical journeys exist: `home.initial_load`, `demo.component_interaction`, `diagnostics.view`, and `action.submit`.
- Startup is represented as a dedicated trace rooted at `app.startup` and exposes `demo_app_startup_duration_ms`, `demo_app_startup_total`, and `demo_app_startup_failures_total`.
- Journey telemetry records use `journey`, `route`, `step`, `request_id`, `status_code`, and `duration_ms` in logs, and `demo_journey_runs_total`, `demo_journey_duration_seconds_sum`, and `demo_journey_failures_total` in metrics.
- Every log event includes `ts`, `level`, `message`, `service`, `stack_id`, `worktree_id`, and `event_type`, with extra flat fields added when relevant.
- Every span should carry `service.name`, `stack_id`, and `worktree_id`; journey spans also add `journey`, `route`, `request_id`, and `ui.step` when available.
- `src/app/api/metrics/route.ts` serves plain-text Prometheus output, and `src/app/api/observability/journey/route.ts` validates canonical journeys before recording the run.
- `instrumentation.ts` registers OpenTelemetry through `@vercel/otel` and skips the Node-only startup signal when `NEXT_RUNTIME` is `edge`.

# Update Triggers

- Update when canonical journeys change or a new tracked journey is added.
- Update when log payloads, metric names, trace attributes, or API response shapes change.
- Update when the app changes how or where observability signals are emitted.
