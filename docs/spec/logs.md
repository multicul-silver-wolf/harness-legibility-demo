# Logs Spec

## Objective

Expose app and harness logs from the current worktree so an agent can answer:

- did startup fail;
- what errors occurred during a run;
- which request or journey produced those errors;
- what happened immediately before and after a failure.

## Source of truth

`VictoriaLogs` is the log store for v1.

## Ingestion path

1. App emits structured JSON logs directly to `VictoriaLogs` over its HTTP ingestion API.
2. The app includes stack metadata on every log event.

This direct path is simpler than the OpenAI diagram because it skips the intermediate fan-out layer. That tradeoff is intentional in v1.

## Required log classes

The app must emit the following log classes:

- `startup`
  - boot start
  - boot complete
  - boot failure
- `request`
  - method
  - route
  - status
  - duration
- `journey`
  - journey start
  - journey step
  - journey end
- `error`
  - uncaught server errors
  - failed actions
  - failed fetches
- `harness`
  - stack up
  - stack down
  - workload start
  - workload end

## Required event fields

Every log event must contain:

- `ts`
- `level`
- `message`
- `service`
- `stack_id`
- `worktree_id`
- `event_type`

The following fields are required when the event type makes them meaningful:

- `request_id`
- `trace_id`
- `span_id`
- `route`
- `method`
- `status_code`
- `duration_ms`
- `journey`
- `step`
- `error_code`

The logging schema should favor flat fields over nested objects so that querying stays simple.

## Storage and retention

- Storage lives inside the worktree-owned stack directory.
- Default retention is short-lived and tied to stack lifecycle.
- `stack down --purge` must remove log data.

This demo does not need shared or long-lived logs.

## Query contract

The public contract is a constrained LogQL-like wrapper with structured arguments. V1 does not implement a free-form LogQL parser.

- label-style selectors for `stack_id`, `service`, `level`, `journey`, `route`
- message substring filters
- bounded time windows
- ordering and limit

Internally, the query layer translates to VictoriaLogs `LogsQL`.

V1 deliberately does not need full Loki compatibility. It needs enough query power to support:

- "show all error logs from this stack in the last five minutes"
- "show startup logs for the latest run"
- "show logs for request_id X"
- "show logs for journey Y where duration_ms > 2000"

## Acceptance criteria

- Agent can fetch startup logs scoped to the active stack.
- Agent can find any error emitted during a workload run.
- Agent can correlate request and journey logs by `request_id`, `trace_id`, or `journey`.
- Tearing the stack down removes the corresponding stored logs.

## V1 implementation decisions

- `query-logs` accepts structured filter arguments and returns normalized rows.
- Request logs are emitted by app-owned server code for the demo routes and actions rather than by wrapping the Next.js server.
- Direct HTTP ingestion into `VictoriaLogs` is performed by app code in v1.
