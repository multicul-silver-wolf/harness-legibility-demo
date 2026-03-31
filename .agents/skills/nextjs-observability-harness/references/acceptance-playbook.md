# Acceptance Playbook

## Boundary Discussion Template

Use this structure before editing:

1. Explain the harness pieces.
   - Logs prove structured events exist.
   - Metrics prove counters and durations are scrapeable.
   - Traces prove latency and request identity across critical flows.
2. List the files you expect to add or change.
3. Flag visible tradeoffs:
   - default layout versus custom directories
   - repo-local scripts versus existing ops tooling
   - lightweight validator only versus richer repo-native tests
4. Ask for explicit approval before implementation.

## Layout Override Pattern

When the developer wants different paths, create a small JSON file and pass it to the validator with `--layout`.

Example:

```json
{
  "paths": {
    "instrumentation": "src/instrumentation.ts",
    "metricsRoute": "src/app/api/internal/metrics/route.ts",
    "journeyRoute": "src/app/api/internal/observability/journey/route.ts"
  }
}
```

Only override what changed; the validator fills the rest from defaults.

## Validation Ladder

1. Static baseline
   - `node scripts/validate-harness.js --repo /absolute/path/to/repo`
   - Use when the app cannot run yet or the repository lacks its heavier test harness.
2. Runtime baseline
   - `node scripts/validate-harness.js --repo /absolute/path/to/repo --app-url http://127.0.0.1:3000`
   - Use when the app is already running or easy to boot.
   - For local development acceptance, default to `npm run dev` unless the developer explicitly asks for production-mode proof.
3. Repo-native validation
   - Add `npm run build`, `npm run test`, or smoke scripts only after the bundled validator passes.

## Isolation Note

- If you can launch the agent from inside the target repository, prefer that over spawning from a parent repo thread.
- A direct child-repo launch reduces context bleed from the source repository and makes it more likely the agent reasons only over the target repo plus the installed skill.

## Local Stack Binary Rule

- Prefer stack binaries from `.observability/bin` when that directory exists in the target repository.
- Do not assume Homebrew, PATH-level, or machine-global Victoria binaries are available or acceptable.
- If binaries are missing, call that out during boundary discussion instead of silently falling back to system paths.

## Detached Process Caveat

- Some agent execution environments do not preserve detached background processes reliably, even when `nohup` is used.
- If `stack-up.sh` lays out env and storage correctly but the Victoria services do not stay alive, keep the stack in a persistent shell or PTY for the duration of runtime validation and report that workaround in the handoff.

## Project Install Note

- Project-level `npx skills` installs may create `.agents/` plus agent-specific directories such as `.claude/`.
- If the target repository runs lint or formatting tools across the whole tree, decide explicitly whether those directories are part of the lint surface or should be ignored.
- The bundled validator script is real repository content once installed; do not assume repo-wide checks will skip it automatically.

## Acceptance Prompt Patterns

- For fuller user-style prompt examples, read [example-prompts.md](./example-prompts.md).
- Startup proof
  - `Use $nextjs-observability-harness to boot the stack and app, then prove startup telemetry exists with one startup metric and one startup trace.`
- Journey proof
  - `Use $nextjs-observability-harness to replay the canonical journeys and report the newest log, metric, and span evidence for each one.`
- Dev-mode proof
  - `Use $nextjs-observability-harness to boot the local stack, run the app with npm run dev, and prove one real journey with a log, a metric, and a trace from the active dev server.`
- Regression proof
  - `Use $nextjs-observability-harness after your code change and prove the harness still emits startup telemetry, journey logs, journey metrics, and journey traces.`

## Result Reporting Template

- Scope approved by developer
- Files created or changed
- Validation commands run
- Pass or fail summary
- Skipped checks with reason
- One follow-up acceptance prompt
