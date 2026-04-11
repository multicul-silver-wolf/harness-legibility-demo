---
title: Repo Local Skills
description: Durable notes for repository-specific skills stored under .agents/skills.
updateAt: 2026-04-11
---

# Scope

- Covers [`.agents/skills/project-docs-system/SKILL.md`](../../.agents/skills/project-docs-system/SKILL.md), [`.agents/skills/nextjs-observability-harness/SKILL.md`](../../.agents/skills/nextjs-observability-harness/SKILL.md), [`.agents/skills/skill-optimizer/SKILL.md`](../../.agents/skills/skill-optimizer/SKILL.md), and their bundled resources.
- Use this doc when adding a new repo-local skill, changing an existing skill's workflow, or updating validation and acceptance expectations for those skills.

# Current Subdomain Docs

- Repo-local skills should stay narrow and procedural: keep trigger logic in SKILL frontmatter, keep larger implementation details in `references/`, and store deterministic helpers in `scripts/`.
- Every repo-local skill should keep `SKILL.md` aligned with `agents/openai.yaml`; if the skill purpose or default prompt changes, update both in the same change.
- Validate every repo-local skill with the `skill-creator` quick validator after editing the skill folder.
- When a skill ships helper scripts, run at least one realistic invocation of the script before considering the skill done.
- `nextjs-observability-harness` is the repository's reusable guide for scaffolding the demo-style telemetry harness into another Next.js repository, with a bundled validator that supports static checks and optional runtime checks.
- `nextjs-observability-harness` now treats two experiment-backed behaviors as durable defaults: prefer repo-local stack binaries under `.observability/bin` when available, and default to `npm run dev` for local runtime proof unless the developer explicitly requests production-mode verification.
- `nextjs-observability-harness` also expects one real end-to-end proof across logs, metrics, and traces before final handoff whenever the app can run; a green lightweight validator alone is only baseline validation.
- `nextjs-observability-harness` now keeps a dedicated `references/minimal-acceptance.md` path for the smallest acceptable three-panel proof. Use it when the target repo is a monorepo, the app lives below the repo root, or the developer only wants backend liveness rather than the full smoke story.
- `nextjs-observability-harness` should optimize for stable evidence, not for one launcher script. `scripts/stack-up.sh` is a convenience entrypoint when it works, but agents may use another stable local orchestration path and should report that choice explicitly.
- `skill-optimizer` is installed repo-locally as an auditing aid for agent skills; use it to analyze observed trigger quality, workflow completion, and static CSO issues, then record the resulting findings in `.docs/observations/`.

# Update Triggers

- Update this file when repo-local skills are added, removed, or renamed.
- Update this file when a skill changes its validation contract, acceptance flow, or bundled helper script expectations.
