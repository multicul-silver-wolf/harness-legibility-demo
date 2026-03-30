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
metrics_target="${NEXTJS_METRICS_TARGET:-127.0.0.1:3000}"
service_name="${OBSERVABILITY_SERVICE_NAME:-$worktree_id}"
logs_endpoint="${OBSERVABILITY_LOGS_ENDPOINT:-http://127.0.0.1:10528/insert/jsonline?_stream_fields=service,stack_id,worktree_id,level,event_type}"
traces_endpoint="${OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:-http://127.0.0.1:11428/insert/opentelemetry/v1/traces}"
otel_service_name="${OTEL_SERVICE_NAME:-$service_name}"

resolve_binary() {
  local override="${1:-}"
  shift

  if [[ -n "$override" ]]; then
    printf '%s\n' "$override"
    return 0
  fi

  local candidate
  for candidate in "$@"; do
    if command -v "$candidate" >/dev/null 2>&1; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  printf '%s\n' ""
}

victoria_logs_bin="$(resolve_binary "${VICTORIA_LOGS_BIN:-}" victoria-logs-prod victorialogs)"
victoria_metrics_bin="$(resolve_binary "${VICTORIA_METRICS_BIN:-}" victoria-metrics-prod victoriametrics)"
victoria_traces_bin="$(resolve_binary "${VICTORIA_TRACES_BIN:-}" victoria-traces-prod victoria-traces)"

require_binary() {
  local binary="$1"
  if ! command -v "$binary" >/dev/null 2>&1; then
    printf '%s\n' "missing required binary: $binary" >&2
    exit 1
  fi
}

start_process() {
  local name="$1"
  local binary="$2"
  shift 2

  local log_file="$storage_root/process-logs/${name}.log"
  local handle_file="$storage_root/pids/${name}.pid"

  if [[ "$(uname -s)" == "Darwin" ]] && command -v launchctl >/dev/null 2>&1; then
    local label="dev.harness-legibility.${stack_id}.${name}"
    launchctl remove "$label" >/dev/null 2>&1 || true
    launchctl submit -l "$label" -o "$log_file" -e "$log_file" -- "$binary" "$@"
    printf 'launchctl:%s\n' "$label" >"$handle_file"
    return 0
  fi

  nohup "$binary" "$@" >"$log_file" 2>&1 </dev/null &
  printf 'pid:%s\n' "$!" >"$handle_file"
}

wait_for_health() {
  local name="$1"
  local url="$2"

  local attempt
  for attempt in $(seq 1 40); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    sleep 0.25
  done

  printf '%s\n' "failed to start $name at $url" >&2
  exit 1
}

mkdir -p \
  "$storage_root/victoria-logs" \
  "$storage_root/victoria-metrics" \
  "$storage_root/victoria-traces" \
  "$storage_root/pids" \
  "$storage_root/process-logs"

require_binary "$victoria_logs_bin"
require_binary "$victoria_metrics_bin"
require_binary "$victoria_traces_bin"

cat >"$storage_root/victoria-metrics/promscrape.yml" <<EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: nextjs-app
    metrics_path: /api/metrics
    scheme: http
    static_configs:
      - targets:
          - ${metrics_target}
        labels:
          service: ${service_name}
          stack_id: ${stack_id}
          worktree_id: ${worktree_id}
EOF

cat >"$storage_root/env" <<EOF
export STACK_ID=${stack_id}
export WORKTREE_ID=${worktree_id}
export STACK_STORAGE_ROOT=${storage_root}
export VICTORIALOGS_PORT=10528
export VICTORIAMETRICS_PORT=18428
export VICTORITRACES_PORT=11428
export OBSERVABILITY_SERVICE_NAME=${service_name}
export OBSERVABILITY_LOGS_ENDPOINT=${logs_endpoint}
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=${traces_endpoint}
export OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf
export OTEL_SERVICE_NAME=${otel_service_name}
export NEXTJS_METRICS_TARGET=${metrics_target}
export OBSERVABILITY_METRICS_ENDPOINT=http://127.0.0.1:18428
export VICTORIA_LOGS_BIN=${victoria_logs_bin}
export VICTORIA_METRICS_BIN=${victoria_metrics_bin}
export VICTORIA_TRACES_BIN=${victoria_traces_bin}
EOF

export STACK_ID="$stack_id"
export WORKTREE_ID="$worktree_id"
export STACK_STORAGE_ROOT="$storage_root"
export VICTORIALOGS_PORT=10528
export VICTORIAMETRICS_PORT=18428
export VICTORIATRACES_PORT=11428
export OBSERVABILITY_SERVICE_NAME="$service_name"
export OBSERVABILITY_LOGS_ENDPOINT="$logs_endpoint"
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="$traces_endpoint"
export OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf
export OTEL_SERVICE_NAME="$otel_service_name"
export NEXTJS_METRICS_TARGET="$metrics_target"
export OBSERVABILITY_METRICS_ENDPOINT=http://127.0.0.1:18428
export VICTORIA_LOGS_BIN="$victoria_logs_bin"
export VICTORIA_METRICS_BIN="$victoria_metrics_bin"
export VICTORIA_TRACES_BIN="$victoria_traces_bin"

start_process \
  "victoria-logs" \
  "$victoria_logs_bin" \
  -storageDataPath="$storage_root/victoria-logs" \
  -loggerLevel=INFO \
  -httpListenAddr=:10528

start_process \
  "victoria-metrics" \
  "$victoria_metrics_bin" \
  -storageDataPath="$storage_root/victoria-metrics" \
  -promscrape.config="$storage_root/victoria-metrics/promscrape.yml" \
  -selfScrapeInterval=5s \
  -loggerLevel=INFO \
  -httpListenAddr=:18428

start_process \
  "victoria-traces" \
  "$victoria_traces_bin" \
  -storageDataPath="$storage_root/victoria-traces" \
  -loggerLevel=INFO \
  -httpListenAddr=:11428

wait_for_health "victoria-logs" "http://127.0.0.1:10528/health"
wait_for_health "victoria-metrics" "http://127.0.0.1:18428/health"
wait_for_health "victoria-traces" "http://127.0.0.1:11428/health"

printf '%s\n' "stack up complete"
printf '%s\n' "source $storage_root/env"
