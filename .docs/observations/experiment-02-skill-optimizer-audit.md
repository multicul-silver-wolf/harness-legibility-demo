---
title: Experiment 02 Skill Optimizer Audit
description: Audit of nextjs-observability-harness after the second fresh Next.js experiment repo run.
updateAt: 2026-03-31
---

# Scope

- Audits [`.agents/skills/nextjs-observability-harness/SKILL.md`](../../.agents/skills/nextjs-observability-harness/SKILL.md) using the framework in [`.agents/skills/skill-optimizer/SKILL.md`](../../.agents/skills/skill-optimizer/SKILL.md).
- Uses evidence from the second fresh-repo experiment at [`.tmp/experiments/02-nextjs-harness`](../../.tmp/experiments/02-nextjs-harness), including one full boundary-to-implementation subagent run.
- This is a report-only artifact. It does not change any skill files.

# Skill Optimization Report

**Date**: 2026-03-31  
**Scope**: `nextjs-observability-harness`  
**Session data**: 1 experiment repo, 1 observed subagent invocation, 1 positive post-gate user reaction available in-thread

## Overview

| Skill | Triggers | Reaction | Completion | Static | Undertrigger | Token | Score |
|-------|----------|----------|------------|--------|--------------|-------|-------|
| `nextjs-observability-harness` | 1 observed invocation across 1 explicit experiment task | 1 positive, 0 negative, 0 silent switch | 6/6 steps | Strong | 0 observed misses | 384w | 4/5 |

## P0 Fixes

1. None observed in experiment 02.
   Evidence:
   - The most important experiment 01 regression did not reproduce: `npm run lint` passed in [`.tmp/experiments/02-nextjs-harness`](../../.tmp/experiments/02-nextjs-harness).
   - The bundled validator script no longer caused repo-wide Biome failure when installed project-locally under [`.tmp/experiments/02-nextjs-harness/.agents/skills/nextjs-observability-harness`](../../.tmp/experiments/02-nextjs-harness/.agents/skills/nextjs-observability-harness).

## P1 Improvements

1. Add an explicit environment fallback note for `stack-up.sh`.
   Evidence:
   - In experiment 02, the subagent reported that [`.tmp/experiments/02-nextjs-harness/scripts/stack-up.sh`](../../.tmp/experiments/02-nextjs-harness/scripts/stack-up.sh) could generate the expected env and storage layout, but `nohup`-started Victoria services did not remain alive after the command returned in this execution environment.
   - Runtime validation still passed, but only after the subagent kept VictoriaMetrics and VictoriaTraces alive as explicit long-running processes.
   Suggested fix:
   - Add a short note in [`.agents/skills/nextjs-observability-harness/references/acceptance-playbook.md`](../../.agents/skills/nextjs-observability-harness/references/acceptance-playbook.md) explaining that some agent environments do not preserve detached background processes reliably, and that agents may need a temporary long-running-process fallback to complete runtime validation.

2. Add an explicit `## Overview` section to [`.agents/skills/nextjs-observability-harness/SKILL.md`](../../.agents/skills/nextjs-observability-harness/SKILL.md).
   Evidence:
   - Static quality check 4.4 expects an Overview section; the skill is otherwise compact and passes the other structural checks.
   Suggested fix:
   - Add a 1-2 sentence `## Overview` section between the title and `## Rules` that states this skill scaffolds the demo-style Victoria-backed proof loop for fresh or partially instrumented Next.js App Router repositories.

## P2 Optional Optimizations

1. Front-load more “fresh repo” language into the description.
   Evidence:
   - This experiment explicitly named the skill, so routing was perfect.
   - For broader undertrigger resistance, phrases like “fresh repo”, “bootstrap”, or “new Next.js repo” could appear earlier in the description without adding workflow leak.
   Suggested direction:
   - Keep the description concise, but consider wording like “Use when bootstrapping or repairing a demo-style Next.js App Router observability harness...”

2. Document the port-conflict fallback more directly in acceptance examples.
   Evidence:
   - During implementation, port `3000` was occupied and the subagent moved runtime validation to `3001`.
   - The run still succeeded because it kept the app URL aligned with the validator invocation.
   Suggested fix:
   - Add one example to [`.agents/skills/nextjs-observability-harness/references/example-prompts.md`](../../.agents/skills/nextjs-observability-harness/references/example-prompts.md) or the acceptance playbook showing how to validate with a non-default app port.

## Per-Skill Diagnostics

### `nextjs-observability-harness`

#### 4.1 Trigger Rate

- Observed explicit trigger messages in this experiment: 1.
- Observed actual invocations: 1 completed subagent run.
- Evidence that the task should trigger the skill and did:

> “在实验目录初始化一个子智能体，让它使用harness技能”

- The actual subagent prompt was also explicit:

> “Please work in `/Users/openclaw/projects/Playground/harness-legibility-demo/.tmp/experiments/02-nextjs-harness` and use the installed `$nextjs-observability-harness` skill.”

- Assessment: healthy for the observed sample. No routing miss was observed.

#### 4.2 Post-Invocation User Reaction

- Invocation reaction: positive.
  Evidence:

> “它好了，让它继续”

- In-thread follow-up approval to continue implementation:

> “That boundary looks good. Please continue with the required changes now...”

- Summary: 1 positive, 0 silent switch, 0 negative, 0 corrective overrides.

#### 4.3 Workflow Completion Rate

- Defined workflow steps in the skill: 6.
- The observed invocation completed through Step 6/6, including:
  - repository inspection
  - harness explanation
  - explicit `required` / `optional` boundary discussion
  - implementation
  - bundled validator plus repo-native validation
  - handoff with a follow-up acceptance prompt
- Raw completion: 6/6 steps = 100%.
- Interpretation: strong. This run exercised the full happy path, not just the approval gate.

#### 4.4 Static Quality Analysis

| Check | Result | Notes |
|-------|--------|-------|
| Frontmatter format | Pass | `name` + quoted `description` only |
| Name format | Pass | `nextjs-observability-harness` is hyphen-case |
| Description trigger | Pass | Begins with explicit initialize / repair use case |
| Description workflow leak | Pass | Description is now concise and capability-focused |
| Description pushiness | Pass | Strong “Use when...” framing |
| Overview section | Flag | No dedicated `## Overview` section |
| Rules section | Pass | Present |
| MUST/NEVER density | Pass | 0 occurrences of `MUST` / `NEVER` / `ALWAYS` |
| Word count | Pass | 384 words, under the 500-word guidance |
| Narrative anti-pattern | Pass | Instructional, not story-based |
| YAML quoting safety | Pass | Description is double-quoted |
| Critical info position | Pass | Core trigger and Next.js / observability terms appear early |
| Description 250-char check | Pass | Primary routing terms appear within the first 250 characters |
| Trigger condition count | Pass | Tightened compared to experiment 01 |

- Static quality verdict: strong. The only remaining structural miss is the absent `## Overview` header.

#### 4.5a False Positive Rate (Overtrigger)

- Observed false positives: 0.
- The skill was invoked exactly for a fresh-repo harness bootstrap task, and the user accepted its boundary-first behavior.

#### 4.5b Undertrigger Detection

- Observed missed opportunities in experiment 02: 0.
- The developer explicitly requested harness initialization in a fresh Next.js repo, and the skill was used immediately.
- Compounding risk assessment: not observed in current data.
- Status: no undertrigger evidence in experiment 02; longitudinal data is still limited to a small number of controlled runs.

#### 4.6 Cross-Skill Conflicts

- No material trigger conflict observed with [`.agents/skills/project-docs-system/SKILL.md`](../../.agents/skills/project-docs-system/SKILL.md).
  - `project-docs-system` is for `.docs/` maintenance.
  - `nextjs-observability-harness` is for telemetry scaffold and validation.
- No material trigger conflict observed with [`.agents/skills/skill-optimizer/SKILL.md`](../../.agents/skills/skill-optimizer/SKILL.md).
  - `skill-optimizer` is a meta-audit skill.
  - `nextjs-observability-harness` is a build and repair skill.

#### 4.7 Environment Consistency

- Pass for referenced local resources:
  - [references/scaffold-spec.md](../../.agents/skills/nextjs-observability-harness/references/scaffold-spec.md) exists
  - [references/acceptance-playbook.md](../../.agents/skills/nextjs-observability-harness/references/acceptance-playbook.md) exists
  - [references/example-prompts.md](../../.agents/skills/nextjs-observability-harness/references/example-prompts.md) exists
  - [scripts/validate-harness.js](../../.agents/skills/nextjs-observability-harness/scripts/validate-harness.js) exists
- Pass for runtime prerequisites used in experiment 02:
  - local Next.js docs existed in `node_modules/next/dist/docs/`
  - `node`, `npm`, `python3`, `curl`, and `nohup` were installed
  - expected scaffold targets existed after implementation in [`.tmp/experiments/02-nextjs-harness`](../../.tmp/experiments/02-nextjs-harness)
- Operational caveat:
  - detached background-process stability remains environment-dependent, so [`.tmp/experiments/02-nextjs-harness/scripts/stack-up.sh`](../../.tmp/experiments/02-nextjs-harness/scripts/stack-up.sh) is structurally correct but not fully portable across all agent execution environments.

#### 4.8 Token Economics

- Word count: 384
- Observed invocation count: 1
- Cost-effectiveness: 1 / 384 = 0.0026 observed invocations per word
- Progressive disclosure tier check:
  - Tier 1 frontmatter: pass, 201-character description
  - Tier 2 body: pass, under 500 words
  - Tier 3 references: pass, three reference files plus a script are used
- Verdict: healthy. This is no longer a compression candidate; it is compact and still behaviorally effective.

## Notes

- The strongest observed behavior in experiment 02 was full-path compliance: the skill taught the agent to explain the stack, wait at the gate, implement the scaffold, and validate in layers without skipping the handoff step.
- The most meaningful improvement over experiment 01 is that repo-wide linting no longer broke on the vendored skill files.
- The strongest remaining failure mode is not routing or static quality; it is the environment-dependent reliability of `stack-up.sh` when an agent execution environment does not preserve detached background processes.
