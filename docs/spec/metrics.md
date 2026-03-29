# Metrics Spec

## Objective

Expose numeric runtime signals that let an agent make pass/fail judgments with PromQL.

The first-class use case is:

- "Ensure service startup completes in under 800ms."

The second-class use cases are:

- request latency stays under a threshold;
- error rate remains zero during a run;
- critical journey duration stays within a budget.

## Source of truth

`VictoriaMetrics` is the metrics store for v1.

The public query surface is PromQL-compatible.

## Ingestion path

1. App exposes a Prometheus-compatible `/metrics` endpoint.
2. `VictoriaMetrics` scrapes that endpoint directly for the current stack.

Fallback path if direct scraping later becomes awkward:

1. App exposes a Prometheus metrics endpoint.
2. `vmagent` scrapes the endpoint.
3. `vmagent` remote-writes to `VictoriaMetrics`.
4. `query-metrics` continues to expose PromQL and the rest of the demo remains unchanged.

This reflects VictoriaMetrics' native strengths more directly than an all-OTLP path.

## Required labels

Every emitted metric must include enough identity to isolate worktrees:

- `stack_id`
- `worktree_id`
- `service`

Where relevant, metrics should also include:

- `route`
- `method`
- `status_code`
- `journey`
- `phase`

## Required metrics

### Startup

- `demo_app_startup_duration_ms`
  - last successful startup duration for the running stack
- `demo_app_startup_total`
  - count of startup attempts
- `demo_app_startup_failures_total`
  - count of failed startups

### HTTP

- `demo_http_requests_total`
  - total requests
- `demo_http_request_duration_seconds`
  - histogram of request latency
- `demo_http_request_errors_total`
  - request failures

### Journeys

- `demo_journey_runs_total`
  - number of completed journey executions
- `demo_journey_duration_seconds`
  - histogram of end-to-end journey latency
- `demo_journey_failures_total`
  - journey failures

## Metric semantics

The startup metric is intentionally simple in v1. We only need enough fidelity to answer:

- what was the last startup duration for this stack;
- did it complete successfully;
- was it under the budget.

Journey metrics complement traces rather than replace them. Metrics answer "did the journey stay inside its budget." Traces answer "which span caused the budget breach."

In v1, `demo_app_startup_duration_ms` is a gauge containing the most recent successful startup duration for the active stack.

In v1, journey metrics are emitted directly by app code and are not derived from traces.

## PromQL expectations

The agent should be able to ask:

- latest startup duration for this stack
- request error count over the last N minutes
- p95 request latency for a given route
- p95 journey latency for a named journey

The wrapper does not need to hide PromQL. PromQL is part of the product story for this demo.

## Acceptance criteria

- Agent can query the current stack's startup duration.
- Agent can determine whether startup is under 800ms.
- Agent can query latency and error metrics for an individual route.
- Agent can query duration metrics for each named journey.
- Metrics disappear when the stack is torn down and its storage is purged.

## V1 implementation decisions

- `demo_app_startup_duration_ms` is a gauge in v1.
- Journey metrics are emitted directly by app code in v1.
- `VictoriaMetrics` scrapes the app directly in v1; `vmagent` is a later compatibility option.
