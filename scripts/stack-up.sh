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
metrics_target="${NEXTJS_METRICS_TARGET:-host.docker.internal:3000}"
service_name="${OBSERVABILITY_SERVICE_NAME:-$worktree_id}"
logs_endpoint="${OBSERVABILITY_LOGS_ENDPOINT:-http://127.0.0.1:10528/insert/jsonline?_stream_fields=service,stack_id,worktree_id,level,event_type}"
traces_endpoint="${OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:-http://127.0.0.1:11428/insert/opentelemetry/v1/traces}"
otel_service_name="${OTEL_SERVICE_NAME:-$service_name}"

mkdir -p \
  "$storage_root/victoria-logs" \
  "$storage_root/victoria-metrics" \
  "$storage_root/victoria-traces"

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
STACK_ID=${stack_id}
WORKTREE_ID=${worktree_id}
STACK_STORAGE_ROOT=${storage_root}
COMPOSE_PROJECT_NAME=${compose_project_name}
VICTORIALOGS_PORT=10528
VICTORIAMETRICS_PORT=18428
VICTORITRACES_PORT=11428
OBSERVABILITY_SERVICE_NAME=${service_name}
OBSERVABILITY_LOGS_ENDPOINT=${logs_endpoint}
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=${traces_endpoint}
OTEL_SERVICE_NAME=${otel_service_name}
NEXTJS_METRICS_TARGET=${metrics_target}
EOF

export STACK_ID="$stack_id"
export WORKTREE_ID="$worktree_id"
export STACK_STORAGE_ROOT="$storage_root"
export COMPOSE_PROJECT_NAME="$compose_project_name"
export VICTORIALOGS_PORT=10528
export VICTORIAMETRICS_PORT=18428
export VICTORIATRACES_PORT=11428
export OBSERVABILITY_SERVICE_NAME="$service_name"
export OBSERVABILITY_LOGS_ENDPOINT="$logs_endpoint"
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="$traces_endpoint"
export OTEL_SERVICE_NAME="$otel_service_name"
export NEXTJS_METRICS_TARGET="$metrics_target"

docker compose \
  -f "$compose_file" \
  -p "$compose_project_name" \
  up -d

printf '%s\n' "stack up complete"
printf '%s\n' "source $storage_root/env"
