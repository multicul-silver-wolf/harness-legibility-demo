---
title: Experiment 03 Skill Optimizer Audit
description: Audit of nextjs-observability-harness after the third fresh Next.js experiment run, launched directly inside the child repo.
updateAt: 2026-03-31
---

# Scope

- Audits [`.agents/skills/nextjs-observability-harness/SKILL.md`](../../.agents/skills/nextjs-observability-harness/SKILL.md) using the framework in [`.agents/skills/skill-optimizer/SKILL.md`](../../.agents/skills/skill-optimizer/SKILL.md).
- Uses evidence from the third fresh-repo experiment at [`.tmp/experiments/03-nextjs-harness`](../../.tmp/experiments/03-nextjs-harness), including one standalone Codex session launched directly inside the child repo.
- This is a report-only artifact. It does not change any skill files.

# Skill Optimization Report

**Date**: 2026-03-31  
**Scope**: `nextjs-observability-harness`  
**Session data**: 1 standalone experiment session, 11 user turns, 1 full scaffold run plus extended runtime debugging

## Overview

| Skill | Triggers | Reaction | Completion | Static | Undertrigger | Token | Score |
|-------|----------|----------|------------|--------|--------------|-------|-------|
| `nextjs-observability-harness` | 1 explicit invocation, 11 in-domain turns | 3 positive, 3 corrective, 0 negative | 6/6 workflow steps plus repair loop | Strong | 0 observed misses | 384w | 4/5 |

## P0 Fixes

1. None observed in experiment 03.
   Evidence:
   - The skill triggered immediately from a direct child-repo session.
   - The session stayed inside the harness domain from initialization through three-panel runtime proof and follow-up corrections.

## P1 Improvements

1. Add an explicit repo-local binary rule.
   Evidence:
   - The user had to correct the execution model with:

> “这几个bin都在本仓库内，而不是到机器里”

   - Earlier in the session, the agent attempted to rely on machine-level binaries before being redirected to [`.observability/bin`](../../.tmp/experiments/03-nextjs-harness/.observability/bin).
   Suggested fix:
   - Add a rule near the top of [SKILL.md](../../.agents/skills/nextjs-observability-harness/SKILL.md) such as: “Prefer repo-local stack binaries under `.observability/bin` when present; do not assume system-installed Victoria binaries.”

2. Add a dev-first runtime validation rule for local harness work.
   Evidence:
   - The agent chose `next start` first, and the user corrected it twice:

> “你没启动开发服务器吧”

> “你为什么会认为这三个要在生产服务器运行”

   Suggested fix:
   - In [references/acceptance-playbook.md](../../.agents/skills/nextjs-observability-harness/references/acceptance-playbook.md), note that local harness acceptance should default to `npm run dev` unless the user explicitly asks for production-mode verification.

3. Add a short isolation note for manual child-repo launches.
   Evidence:
   - The session transcript was [rollout-2026-03-31T01-43-15-019d3fd7-b8f8-79d2-a083-849e844622de.jsonl](/Users/openclaw/.codex/sessions/2026/03/31/rollout-2026-03-31T01-43-15-019d3fd7-b8f8-79d2-a083-849e844622de.jsonl).
   - Its `cwd` was [`.tmp/experiments/03-nextjs-harness`](../../.tmp/experiments/03-nextjs-harness).
   - `forked_from_id` was `None`, unlike earlier forked-subagent experiments.
   Suggested fix:
   - In the acceptance playbook, add one note that launching from inside the target repo reduces context bleed compared with spawning from a parent repo thread.

## P2 Optional Optimizations

1. Add a repo-local-bins example prompt.
   Evidence:
   - This session showed that binary placement is a real acceptance concern, not just an implementation detail.
   Suggested fix:
   - Add one example to [references/example-prompts.md](../../.agents/skills/nextjs-observability-harness/references/example-prompts.md) asking the agent to keep all Victoria binaries inside the target repository.

2. Add a dev-server three-panel proof example.
   Evidence:
   - The most valuable runtime evidence in experiment 03 came from validating logs, metrics, and traces under `next dev`, not `next start`.
   Suggested fix:
   - Add one example acceptance prompt explicitly requiring `next dev` plus one real journey proof across all three backends.

## Per-Skill Diagnostics

### `nextjs-observability-harness`

#### 4.1 Trigger Rate

- Observed explicit trigger messages in this experiment: 1.
- Observed actual invocations: 1 completed standalone session.
- Evidence that the task should trigger the skill and did:

> “$nextjs-observability-harness 初始化harness”

- Follow-up user turns all remained in the same capability area:
  - `确认`
  - `实际执行三件套`
  - `给你权限了，继续`
  - `直接尝试一个用例`
  - `这几个bin都在本仓库内，而不是到机器里`
  - `你再试试三个板块`
  - `你没启动开发服务器吧`
  - `你为什么会认为这三个要在生产服务器运行`
  - `好`
  - `把三个都调通`
- Assessment: healthy. This is the strongest trigger sample so far because the skill remained relevant across 11 turns.

#### 4.2 Post-Invocation User Reaction

- First 3 user reactions after invocation were positive:
  - `确认`
  - `实际执行三件套`
  - `给你权限了，继续`
- Later user messages were corrective rather than rejecting:
  - repo-local binaries
  - dev-vs-prod validation mode
  - expectation to fully connect all three panels
- Summary: 3 positive, 3 corrective, 0 silent switch, 0 negative.
- Interpretation: good fit with real-world corrections. The skill was not a false positive, but it still left some operational assumptions implicit.

#### 4.3 Workflow Completion Rate

- Defined workflow steps in the skill: 6.
- The observed session completed all 6:
  - repository inspection
  - harness explanation
  - explicit boundary gate
  - scaffold implementation
  - layered validation
  - handoff summaries during and after repair work
- Raw completion: 6/6 steps = 100%.
- Interpretation: strong. This is the best completion sample because it includes a long repair loop after the nominal workflow completed.

#### 4.4 Static Quality Analysis

| Check | Result | Notes |
|-------|--------|-------|
| Frontmatter format | Pass | `name` + quoted `description` only |
| Name format | Pass | `nextjs-observability-harness` is hyphen-case |
| Description trigger | Pass | Starts with explicit initialize / repair phrasing |
| Description workflow leak | Pass | Description stays capability-focused |
| Description pushiness | Pass | Strong “Use when...” framing |
| Overview section | Flag | No dedicated `## Overview` section |
| Rules section | Pass | Present |
| MUST/NEVER density | Pass | 0 occurrences of `MUST` / `NEVER` / `ALWAYS` |
| Word count | Pass | 384 words, under the 500-word guidance |
| Narrative anti-pattern | Pass | Instructional, not story-based |
| YAML quoting safety | Pass | Description is double-quoted |
| Critical info position | Pass | Core routing terms appear early |
| Description 250-char check | Pass | Primary trigger terms appear within the first 250 characters |
| Trigger condition count | Pass | Compact trigger story |

- Static quality verdict: strong. The only remaining structural miss is the absent `## Overview` header.

#### 4.5a False Positive Rate (Overtrigger)

- Observed false positives: 0.
- The user explicitly called the skill and kept the whole session within the harness problem space.

#### 4.5b Undertrigger Detection

- Observed missed opportunities in this experiment: 0.
- The direct child-repo session is especially strong evidence because the skill still triggered cleanly without parent-thread context.
- Compounding risk assessment: not observed in current sample.
- Status: no undertrigger evidence in experiment 03.

#### 4.6 Cross-Skill Conflicts

- No material cross-skill conflict was observed.
- This session is useful because it was not forked from a parent repo thread:
  - `cwd` was [`.tmp/experiments/03-nextjs-harness`](../../.tmp/experiments/03-nextjs-harness)
  - `forked_from_id` was `None`
- Interpretation: manual child-repo launch reduced the chance that broader repo-root skill context would interfere.

#### 4.7 Environment Consistency

- Pass for referenced skill resources:
  - [references/scaffold-spec.md](../../.agents/skills/nextjs-observability-harness/references/scaffold-spec.md) exists
  - [references/acceptance-playbook.md](../../.agents/skills/nextjs-observability-harness/references/acceptance-playbook.md) exists
  - [references/example-prompts.md](../../.agents/skills/nextjs-observability-harness/references/example-prompts.md) exists
  - [scripts/validate-harness.js](../../.agents/skills/nextjs-observability-harness/scripts/validate-harness.js) exists
- Pass for experiment runtime environment:
  - local Next docs existed in `node_modules/next/dist/docs/`
  - repo-local stack binaries existed in [`.observability/bin`](../../.tmp/experiments/03-nextjs-harness/.observability/bin)
  - the session eventually proved logs, metrics, and traces under `next dev`
- Operational caveats revealed:
  - repo-local binary preference should be explicit
  - detached-process behavior still matters for stack management
  - runtime mode expectations should be explicit in local acceptance flows

#### 4.8 Token Economics

- Word count: 384
- Observed explicit invocation count: 1
- In-domain user turns after trigger: 11/11
- Cost-effectiveness: 1 / 384 = 0.0026 observed invocations per word
- Progressive disclosure tier check:
  - Tier 1 frontmatter: pass, 201-character description
  - Tier 2 body: pass, under 500 words
  - Tier 3 references: pass, three reference files plus a script are used
- Verdict: healthy. The skill remains compact while supporting a long, high-value debugging session.

## Notes

- The most valuable finding in experiment 03 is not just that the skill worked, but that launching manually from inside the target repo reduced context leakage while preserving the skill’s workflow.
- The strongest new improvement target is operational specificity: repo-local binaries and dev-first validation should be stated more explicitly.
- This transcript is especially useful because it contains successful routing, meaningful user corrections, and final three-panel runtime proof inside a standalone child-repo session.
