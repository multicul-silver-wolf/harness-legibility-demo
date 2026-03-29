#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

IFS=$'\t' read -r stack_id worktree_id <<EOF
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

process.stdout.write([stackId, worktreeId].join("\t"));
NODE
)
EOF

storage_root="$repo_root/.observability/$stack_id"

stop_pid_file() {
  local pid_file="$1"

  if [[ ! -f "$pid_file" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"

  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid"
    wait "$pid" 2>/dev/null || true
  fi

  rm -f "$pid_file"
}

stop_pid_file "$storage_root/pids/victoria-logs.pid"
stop_pid_file "$storage_root/pids/victoria-metrics.pid"
stop_pid_file "$storage_root/pids/victoria-traces.pid"

rm -rf "$storage_root"

printf '%s\n' "stack down complete"
