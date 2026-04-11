# Minimal Acceptance

Use this path when the goal is only to prove that VictoriaLogs, VictoriaMetrics, and VictoriaTraces are all working. This is the smallest runtime proof for fresh repos, monorepos, nested app packages, or unusual local orchestration where a larger smoke flow would add noise.

## Goal

Prove one real journey end to end with:

- one structured log row in VictoriaLogs
- one successful scrape plus one journey metric in VictoriaMetrics
- one journey span in VictoriaTraces

Keep the proof tied together with shared identifiers such as `stack_id`, `journey`, `ui.step`, and ideally `request_id`.

## Smallest Valid Trigger

- Prefer one public journey replay through the repository's public route instead of browser automation.
- Use `home.initial_load` when the scaffold keeps the default canonical journeys.
- If the target repo uses a different stable public trigger, use that instead of forcing the demo journey names.

Example payload shape:

```json
{
  "journey": "home.initial_load",
  "route": "/",
  "step": "minimal-acceptance",
  "durationMs": 320
}
```

## Minimum Pass Conditions

1. App and stack are both running.
2. VictoriaMetrics scrape health is positive for the active app target.
3. VictoriaLogs returns at least one row for the replayed journey.
4. VictoriaMetrics returns at least one journey metric sample for the replayed journey.
5. VictoriaTraces returns at least one span for the replayed journey.

## Portable Rules

- Do not assume repository root equals app root. Run from the actual app package when working inside a monorepo.
- Do not assume `npm`. Use the package manager and scripts the target repo already exposes.
- Do not assume `scripts/stack-up.sh` is the only valid path. Use any stable local orchestration that yields the same evidence.
- Do not require all four canonical journeys when one stable journey is enough to prove backend liveness.
- Allow one scrape interval before declaring the metrics proof missing.
- If trace-side tag filtering is flaky, fetch recent service traces and filter client-side by `journey` or `ui.step`.

## Suggested Sequence

1. Bring up the local observability stack.
2. Start the app in the simplest stable mode for the environment.
3. Replay one public journey.
4. Query logs.
5. Query metrics.
6. Query traces.
7. Report whether the result is full minimal acceptance or partial acceptance.

## Report Format

- Trigger used
- Shared identifiers observed
- VictoriaLogs evidence
- VictoriaMetrics evidence
- VictoriaTraces evidence
- Full or partial minimal acceptance

## Non-Goals

- Full README smoke coverage
- Browser-first UI proof
- Regression editing
- Replay of every canonical journey
