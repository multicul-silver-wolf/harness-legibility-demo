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

remove_storage_root() {
  local target="$1"
  local attempt

  if [[ ! -e "$target" ]]; then
    return 0
  fi

  for attempt in $(seq 1 10); do
    rm -rf "$target" 2>/dev/null || true

    if [[ ! -e "$target" ]]; then
      return 0
    fi

    sleep 0.1
  done

  printf '%s\n' "failed to remove stack storage root: $target" >&2
  exit 1
}

stop_pid_file() {
  local pid_file="$1"

  if [[ ! -f "$pid_file" ]]; then
    return 0
  fi

  local handle
  handle="$(cat "$pid_file")"

  case "$handle" in
    launchctl:*)
      launchctl remove "${handle#launchctl:}" >/dev/null 2>&1 || true
      ;;
    pid:*)
      local pid="${handle#pid:}"
      if kill -0 "$pid" >/dev/null 2>&1; then
        kill "$pid"
        wait "$pid" 2>/dev/null || true
      fi
      ;;
    *)
      if [[ "$handle" =~ ^[0-9]+$ ]]; then
        if kill -0 "$handle" >/dev/null 2>&1; then
          kill "$handle"
          wait "$handle" 2>/dev/null || true
        fi
      elif [[ -n "$handle" ]] && command -v launchctl >/dev/null 2>&1; then
        launchctl remove "$handle" >/dev/null 2>&1 || true
      fi
      ;;
  esac

  rm -f "$pid_file"
}

stop_pid_file "$storage_root/pids/victoria-logs.pid"
stop_pid_file "$storage_root/pids/victoria-metrics.pid"
stop_pid_file "$storage_root/pids/victoria-traces.pid"

remove_storage_root "$storage_root"

printf '%s\n' "stack down complete"
