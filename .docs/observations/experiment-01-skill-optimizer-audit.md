---
title: Experiment 01 Skill Optimizer Audit
description: Audit of nextjs-observability-harness after the first fresh Next.js experiment repo run.
updateAt: 2026-03-31
---

# Scope

- Audits [`.agents/skills/nextjs-observability-harness/SKILL.md`](../../.agents/skills/nextjs-observability-harness/SKILL.md) using the framework in [`.agents/skills/skill-optimizer/SKILL.md`](../../.agents/skills/skill-optimizer/SKILL.md).
- Uses evidence from the first fresh-repo experiment at [`.tmp/experiments/01-nextjs-harness`](../../.tmp/experiments/01-nextjs-harness), including one boundary-only invocation and one full implementation invocation.
- This is a report-only artifact. It does not change any skill files.

# Skill Optimization Report

**Date**: 2026-03-31  
**Scope**: `nextjs-observability-harness`  
**Session data**: 1 experiment repo, 2 observed subagent invocations, 2 post-invocation user reactions available in-thread

## Overview

| Skill | Triggers | Reaction | Completion | Static | Undertrigger | Token | Score |
|-------|----------|----------|------------|--------|--------------|-------|-------|
| `nextjs-observability-harness` | 2 observed invocations across 1 explicit experiment task | 1 positive, 1 silent switch, 0 negative | Avg 4.5/6 steps | Mixed | 0 observed misses | 738w, 73 lines | 4/5 |

## P0 Fixes

1. Treat the bundled validator script as target-repo lint surface, not invisible baggage.
   Evidence:
   - In experiment 01, `npm run lint` failed because the installed [`.tmp/experiments/01-nextjs-harness/.agents/skills/nextjs-observability-harness/scripts/validate-harness.js`](../../.tmp/experiments/01-nextjs-harness/.agents/skills/nextjs-observability-harness/scripts/validate-harness.js) does not match Biome formatting.
   - The full-repo Biome run reported formatter drift inside the vendored skill directory, even though the application scaffold itself passed the targeted checks.
   Suggested fix:
   - Either format shipped helper scripts to common repo defaults before publishing, or explicitly document that target repos may want to exclude `.agents/` from repo-wide lint runs.

## P1 Improvements

1. Add an explicit `## Rules` section to [`.agents/skills/nextjs-observability-harness/SKILL.md`](../../.agents/skills/nextjs-observability-harness/SKILL.md).
   Evidence:
   - Static quality check 4.4 expects a Rules section; this skill currently has workflow, validation rules, and reporting rules, but no dedicated Rules header.
   Suggested wording:
   - Add a short `## Rules` section near the top with bright-line constraints such as “Do not edit before developer approval on net-new scaffold work” and “Run the bundled validator before repo-native checks.”

2. Compress the skill body below 500 words and push more detail into `references/`.
   Evidence:
   - Current word count is 738 words across 73 lines.
   - `skill-optimizer` flags 500+ words in SKILL bodies as weak progressive disclosure unless detailed content is pushed into references.
   Suggested fix:
   - Keep the six-step workflow, but shorten explanation bullets and move more examples into [references/scaffold-spec.md](../../.agents/skills/nextjs-observability-harness/references/scaffold-spec.md) and [references/acceptance-playbook.md](../../.agents/skills/nextjs-observability-harness/references/acceptance-playbook.md).

3. Tighten the description so the trigger story is shorter and less workflow-leaky.
   Evidence:
   - Description length is 629 characters, so it passes the 1024-char limit but packs in many trigger clauses.
   - The description currently includes workflow-flavored promises such as “discuss telemetry scope and file changes before editing” and “provide acceptance prompts,” which can dilute the primary routing signal.
   - `skill-optimizer` cites MCP description-quality research as motivation to front-load concise trigger language.
   Suggested direction:
   - Front-load “Use when initializing or maintaining a demo-style Next.js observability harness with VictoriaLogs, VictoriaMetrics, and VictoriaTraces.”
   - Move boundary-discussion and validation behavior into the body instead of the description.

## P2 Optional Optimizations

1. Separate “required file changes” from “optional surface changes” in the boundary discussion template.
   Evidence:
   - In experiment 01, the boundary proposal listed [README.md](../../.tmp/experiments/01-nextjs-harness/README.md), [src/app/page.tsx](../../.tmp/experiments/01-nextjs-harness/src/app/page.tsx), and [src/app/layout.tsx](../../.tmp/experiments/01-nextjs-harness/src/app/layout.tsx) as possible changes, but the final implementation did not need all of them.
   Suggested fix:
   - Ask the agent to label files as `required` or `optional` during the gate, so file plans are more precise.

2. Call out skill-install side effects in target repos.
   Evidence:
   - Project-level `npx skills` installation created both [`.tmp/experiments/01-nextjs-harness/.agents`](../../.tmp/experiments/01-nextjs-harness/.agents) and [`.tmp/experiments/01-nextjs-harness/.claude`](../../.tmp/experiments/01-nextjs-harness/.claude) in experiment 01 when multiple agents were targeted.
   Suggested fix:
   - Add a note in docs or references that project installs may create agent-specific directories in addition to `.agents/`.

## Per-Skill Diagnostics

### `nextjs-observability-harness`

#### 4.1 Trigger Rate

- Observed explicit trigger messages in this experiment: 1 primary task, 1 continuation approval.
- Observed actual invocations: 2 subagent runs.
  - Invocation 1: boundary-only pass, stopped for approval.
  - Invocation 2: full implementation plus validation.
- Evidence that the first task should trigger the skill and did:

> “新建个仓库内 临时文件夹，并且更新到 gitignore 里，我们准备开个新仓库，初始化nextjs，引入这个skill，并且开个subagent 让它遵循那个skill，执行初始化任务，观察行为。”

- Assessment: healthy for the observed sample. No obvious under-selection in experiment 01.

#### 4.2 Post-Invocation User Reaction

- Invocation 1 reaction: positive.
  Evidence:

> “1”

  This followed the boundary-only output and approved the next implementation step, which matches the intended strict-gate workflow.

- Invocation 2 reaction: silent switch / neutral.
  Evidence:

> “我们用科学些的方法，使用 npx skills 方法导入这个 skills https://github.com/hqhq1025/skill-optimizer”

  The user moved to the next experiment setup step without correcting or rejecting the scaffold outcome.

- Summary: 1 positive, 1 silent switch, 0 negative, 0 corrective overrides.

#### 4.3 Workflow Completion Rate

- Defined workflow steps in the skill: 6.
- Invocation 1 completed through Step 3/6, then intentionally stopped at the approval gate.
- Invocation 2 completed through Step 6/6, including validation and handoff.
- Raw average completion: 4.5/6 steps = 75%.
- Interpretation: healthy. The partial completion was user-requested and reflects correct gate behavior, not abandonment.

#### 4.4 Static Quality Analysis

| Check | Result | Notes |
|-------|--------|-------|
| Frontmatter format | Pass | `name` + quoted `description` only |
| Name format | Pass | `nextjs-observability-harness` is hyphen-case |
| Description trigger | Pass | Begins with explicit scaffold / maintain / repair use cases |
| Description workflow leak | Flag | Description includes boundary-discussion and validation behaviors |
| Description pushiness | Pass | Strong “Use when…” framing |
| Overview section | Pass | Present |
| Rules section | Flag | No dedicated `## Rules` section |
| MUST/NEVER density | Pass | 0 occurrences of `MUST` / `NEVER` |
| Word count | Flag | 738 words, over the 500-word guidance |
| Narrative anti-pattern | Pass | Instructional, not story-based |
| YAML quoting safety | Pass | Description is double-quoted and contains `: ` safely |
| Critical info position | Pass | Core scaffold purpose appears in frontmatter and opening section |
| Description 250-char check | Pass | Primary Next.js / observability / harness terms appear early |
| Trigger condition count | Flag | More than 2 trigger clauses are packed into the description |

- Static quality verdict: mixed. Strong purpose and structure, but too much trigger logic and workflow detail is front-loaded into the description, and the body can be slimmer.

#### 4.5a False Positive Rate (Overtrigger)

- Observed false positives: 0.
- In experiment 01 the skill was explicitly requested, and the user did not reject the boundary-first behavior.

#### 4.5b Undertrigger Detection

- Observed missed opportunities in experiment 01: 0.
- The developer explicitly asked for a fresh Next.js repo, imported the skill, and requested a subagent to follow it; the skill was used immediately.
- Compounding risk assessment: not observed in current data.
- Status: no undertrigger evidence in experiment 01; broader longitudinal data is still insufficient.

#### 4.6 Cross-Skill Conflicts

- No material trigger conflict observed with [`.agents/skills/project-docs-system/SKILL.md`](../../.agents/skills/project-docs-system/SKILL.md).
  - `project-docs-system` is about `.docs/` maintenance.
  - `nextjs-observability-harness` is about scaffolding telemetry and validation.
- No material trigger conflict observed with [`.agents/skills/skill-optimizer/SKILL.md`](../../.agents/skills/skill-optimizer/SKILL.md).
  - `skill-optimizer` is a meta-audit skill, not a build/scaffold skill.

#### 4.7 Environment Consistency

- Pass for referenced local resources:
  - [references/scaffold-spec.md](../../.agents/skills/nextjs-observability-harness/references/scaffold-spec.md) exists
  - [references/acceptance-playbook.md](../../.agents/skills/nextjs-observability-harness/references/acceptance-playbook.md) exists
  - [references/example-prompts.md](../../.agents/skills/nextjs-observability-harness/references/example-prompts.md) exists
  - [scripts/validate-harness.js](../../.agents/skills/nextjs-observability-harness/scripts/validate-harness.js) exists
- Pass for runtime prerequisites used in experiment 01:
  - local Next.js 16 docs existed in `node_modules/next/dist/docs/`
  - Node-based validator executed successfully
- Operational caveat:
  - project installs may also create agent-specific directories such as [`.tmp/experiments/01-nextjs-harness/.claude`](../../.tmp/experiments/01-nextjs-harness/.claude), which target repos may need to ignore or account for.

#### 4.8 Token Economics

- Word count: 738
- Line count: 73
- Observed invocation count: 2
- Cost-effectiveness: 2 / 738 = 0.0027 observed invocations per word
- Progressive disclosure tier check:
  - Tier 1 frontmatter: pass, 629-character description
  - Tier 2 body: flag, over 500 words
  - Tier 3 references: pass, three reference files plus a script are used
- Verdict: not a removal candidate because it was used immediately and successfully, but it is a compression candidate.

## Notes

- The strongest observed behavior in experiment 01 was the strict approval gate. The skill successfully taught the agent to stop after the boundary discussion instead of editing immediately.
- The strongest observed failure mode was integration friction with repo-wide linting once the skill’s validator script became part of the target repository.
