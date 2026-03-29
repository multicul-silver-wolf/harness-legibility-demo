---
title: Observability Query Contract
description: Stable notes for logs, metrics, and traces query wrappers.
updateAt: 2026-03-30
---

# Scope

- Covers [`query-logs.ts`](../../src/lib/observability/query-logs.ts), [`query-metrics.ts`](../../src/lib/observability/query-metrics.ts), and [`query-traces.ts`](../../src/lib/observability/query-traces.ts).
- Use this doc when changing query filters, transport endpoints, or normalized result shapes.

# Current Subdomain Docs

- `query-logs` builds constrained VictoriaLogs queries from structured filters only; it is not a free-form LogQL parser.
- `query-metrics` accepts PromQL and normalizes matrix, vector, and scalar responses from VictoriaMetrics.
- `query-traces` accepts structured filters for stack, service, journey, route, request, and span identifiers and normalizes VictoriaTraces or Jaeger responses.
- Query wrappers should keep the public TypeScript contracts stable even if the Victoria backend APIs change.
- Logs queries return rows with `message`, `timestamp`, `level`, and a flat `attributes` object; traces return `traceId` with normalized spans.
- Range queries convert ISO timestamps to backend-friendly values inside the wrapper rather than forcing callers to do it.

# Update Triggers

- Update when query filter shapes, result normalization, or backend endpoint formats change.
- Update when a new query wrapper is added.
