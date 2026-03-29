#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
compose_file="$repo_root/docker-compose.observability.yml"

IFS=$'\t' read -r stack_id worktree_id compose_project_name <<EOF
$(node <<'NODE'
const path = require("node:path");

function normalizePath(input) {
  return path.resolve(input).replace(/\\/g, "/");
}

function fnv1a32(input) {
  let hash = 0x811c9dc5;

  for (const char of input) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

const cwd = normalizePath(process.cwd());
const stackIdSalt = 0x4ab61fa5;
const stackId = `hld-${((fnv1a32(cwd) ^ stackIdSalt) >>> 0)
  .toString(16)
  .padStart(8, "0")}`;
const worktreeId = path.basename(cwd);
const composeProjectName = stackId.replace(/-/g, "_");

process.stdout.write([stackId, worktreeId, composeProjectName].join("\t"));
NODE
)
EOF

storage_root="$repo_root/.observability/$stack_id"

docker compose \
  -f "$compose_file" \
  -p "$compose_project_name" \
  down -v --remove-orphans

rm -rf "$storage_root"

printf '%s\n' "stack down complete"
