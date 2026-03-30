---
title: Docs Index
description: First-level map for repository-specific durable knowledge.
updateAt: 2026-03-30
---

# How To Use

- Start with [.docs/DOCS.md](./DOCS.md) for repository-wide conventions.
- Use the domain list below to find stable implementation guidance for a part of the codebase.

# Domains

- [agents](./agents/index.md): Consult for repo-local agent skills, how they are validated, and how durable skill maintenance is documented under `.agents/skills/`.
- [observability](./observability/index.md): Consult for the local observability stack, telemetry signals, query contracts, and executable smoke-runner workflow in `src/lib/observability`, `src/app/api`, `instrumentation.ts`, and `scripts/`.
- [frontend](./frontend/index.md): Consult for App Router structure, page entry points, styling surfaces, and frontend testing workflows in `src/app`.
