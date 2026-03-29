# Traces Spec

## Objective

Expose spans for startup and the four critical user journeys so an agent can reason about where latency is coming from.

The first-class use case is:

- "No span in these four critical user journeys exceeds two seconds."

## Source of truth

`VictoriaTraces` is the trace store for v1.

`instrumentation.ts` is the framework-native entry point for trace setup in the Next.js app.

## Instrumentation model

The app should use:

- `instrumentation.ts`
  - to register OpenTelemetry in a Next.js-native way
- `instrumentation.node.ts`
  - to configure the Node-only exporter path when needed

This follows the Next.js OpenTelemetry guidance and keeps the demo aligned with the framework's intended extension point.

## Ingestion path

1. `instrumentation.ts` registers tracing for the app.
2. App emits OTLP traces directly to `VictoriaTraces`.

Fallback path if direct exporter wiring later becomes awkward:

1. App emits OTLP traces to a local OpenTelemetry Collector.
2. Collector forwards traces to VictoriaTraces.
3. Log and metrics contracts remain unchanged.

The fallback exists only if the direct exporter path proves too limiting after v1.

## Required journeys

V1 assumes four named user journeys:

- `home.initial_load`
- `demo.component_interaction`
- `diagnostics.view`
- `action.submit`

Each journey must create a root span with child spans for important operations.

## Required span coverage

For each journey, the trace should include spans for:

- route handling
- server component render or action execution
- external fetch or mock I/O when present
- custom business step spans for demo-specific work

The app must also emit startup-related spans for:

- process boot
- app readiness
- critical initialization steps

In v1, startup is represented as a dedicated trace rooted at `app.startup`.

## Required attributes

Every relevant span should include:

- `service.name`
- `stack_id`
- `worktree_id`
- `journey` when applicable
- `route` when applicable

Helpful optional attributes:

- `request_id`
- `ui.step`
- `workload_run_id`

## Query contract

`VictoriaTraces` does not expose native TraceQL in the same way that Tempo does. Its documented query surfaces are:

- LogsQL over stored spans
- Jaeger JSON APIs

V1 should therefore expose a thin `query-traces` wrapper with explicit filters:

- `stack_id`
- `service`
- `journey`
- `min_duration_ms`
- `since`
- `until`

V1 does not implement a free-form trace query language.

The wrapper must support the core questions the agent needs:

- show the slowest spans for journey X
- show any span over 2000ms for this stack
- fetch the full trace for trace_id X

## Acceptance criteria

- Agent can query traces for the active stack only.
- Agent can determine whether any span in a named journey exceeds two seconds.
- Agent can inspect the trace that caused a threshold breach.
- Trace storage is purged with the rest of the worktree stack.

## V1 implementation decisions

- `query-traces` accepts structured filter arguments only.
- Startup is represented as its own trace rooted at `app.startup`.
