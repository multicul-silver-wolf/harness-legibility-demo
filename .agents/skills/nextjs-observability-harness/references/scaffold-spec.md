# Scaffold Spec

## Recommended File Layout

- `instrumentation.ts`
  - Register `@vercel/otel`.
  - Skip the Node-only startup signal when `process.env.NEXT_RUNTIME === "edge"`.
  - Import runtime startup recording lazily.
- `src/lib/observability/journeys.ts`
  - Define canonical journey names and the public journey ingestion endpoint constant.
- `src/lib/observability/logger.ts`
  - Emit flat structured log events to VictoriaLogs.
- `src/lib/observability/metrics.ts`
  - Hold in-memory counters and duration sums rendered in Prometheus text format.
- `src/lib/observability/tracing.ts`
  - Build span attributes and trace query helpers around service, stack, worktree, journey, route, and request identifiers.
- `src/lib/observability/runtime.ts`
  - Record startup and journey signals by coordinating logs, metrics, and traces.
- `src/lib/observability/stack-context.ts`
  - Derive stable `stack_id`, `worktree_id`, service name, and backend endpoints.
- `src/lib/observability/stack-bootstrap.ts`
  - Render env exports, scrape config, and local process plans for the Victoria binaries.
- `src/lib/observability/query-logs.ts`
  - Query VictoriaLogs and normalize rows into agent-friendly objects.
- `src/lib/observability/query-metrics.ts`
  - Query VictoriaMetrics and normalize Prometheus API results.
- `src/lib/observability/query-traces.ts`
  - Query VictoriaTraces through the Jaeger-compatible API and normalize spans.
- `src/app/api/metrics/route.ts`
  - Expose plain-text Prometheus metrics.
- `src/app/api/observability/journey/route.ts`
  - Validate canonical journeys and record a journey run through runtime helpers.
- `scripts/stack-up.sh`
  - Optional convenience entrypoint that starts VictoriaLogs, VictoriaMetrics, and VictoriaTraces for the current worktree and emits a sourceable env file.
- `scripts/stack-down.sh`
  - Stop the local stack and clean the worktree-specific storage root.

## Canonical Journeys

- `home.initial_load`
- `demo.component_interaction`
- `diagnostics.view`
- `action.submit`

Keep these names stable unless the developer explicitly changes the proof contract.

## Signal Contract

- Logs:
  - Include `ts`, `level`, `message`, `service`, `stack_id`, `worktree_id`, and `event_type`.
  - Add flat fields such as `journey`, `route`, `step`, `request_id`, `status_code`, and `duration_ms` when available.
- Metrics:
  - Startup: `demo_app_startup_duration_ms`, `demo_app_startup_total`, `demo_app_startup_failures_total`
  - Journey: `demo_journey_runs_total`, `demo_journey_duration_seconds_sum`, `demo_journey_failures_total`
  - HTTP: `demo_http_requests_total`, `demo_http_request_duration_seconds_sum`, `demo_http_request_errors_total`
- Traces:
  - Startup root span: `app.startup`
  - Shared attributes: `service.name`, `stack_id`, `worktree_id`
  - Journey attributes: `journey`, `route`, `request_id`, `ui.step`

## Stack Contract

- The proof goal is stable local evidence, not a specific launcher implementation.
- Default ports:
  - VictoriaLogs: `10528`
  - VictoriaMetrics: `18428`
  - VictoriaTraces: `11428`
- Required env exports:
  - `STACK_ID`
  - `WORKTREE_ID`
  - `OBSERVABILITY_LOGS_ENDPOINT`
  - `OBSERVABILITY_METRICS_ENDPOINT`
  - `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
  - `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL`
  - `OTEL_SERVICE_NAME`
- Keep stack storage isolated under `.observability/<stack-id>` or an agreed equivalent.
- If the repo ships `stack-up.sh`, keep it aligned with the env exports above; if another supervisor is used, preserve the same signal contract.

## Maintenance Triggers

- Update the scaffold whenever journey names, metric names, trace attributes, stack ports, or API routes change.
- Update validation expectations whenever the default file layout changes.
- Keep `README` examples and smoke flows aligned with the actual proof contract if the target repository treats them as acceptance tests.
