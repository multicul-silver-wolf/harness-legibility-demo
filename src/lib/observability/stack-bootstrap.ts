import type { StackContext } from "./stack-context";

export type VictoriaMetricsScrapeConfigInput = {
  appTarget: string;
};

function envLine(key: string, value: string) {
  return `${key}=${value}`;
}

function yamlQuote(value: string) {
  return JSON.stringify(value);
}

export function buildAppObservabilityEnv(context: StackContext) {
  return [
    envLine("STACK_ID", context.stackId),
    envLine("WORKTREE_ID", context.worktreeId),
    envLine("OBSERVABILITY_STORAGE_ROOT", context.storageRoot),
    envLine("OBSERVABILITY_COMPOSE_PROJECT", context.composeProjectName),
    envLine("OBSERVABILITY_LOGS_ENDPOINT", context.endpoints.logsIngestUrl),
    envLine("OTEL_SERVICE_NAME", context.service),
    envLine(
      "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
      `${context.endpoints.tracesBaseUrl}/insert/opentelemetry/v1/traces`,
    ),
    envLine("OTEL_EXPORTER_OTLP_TRACES_PROTOCOL", "http/protobuf"),
    envLine("OBSERVABILITY_METRICS_ENDPOINT", context.endpoints.metricsBaseUrl),
  ].join("\n");
}

export function renderVictoriaMetricsScrapeConfig(
  input: VictoriaMetricsScrapeConfigInput,
) {
  return [
    "global:",
    "  scrape_interval: 15s",
    "scrape_configs:",
    "  - job_name: nextjs-app",
    "    metrics_path: /api/metrics",
    "    static_configs:",
    "      - targets:",
    `          - ${input.appTarget}`,
  ].join("\n");
}

export function renderDockerComposeTemplate() {
  return [
    "services:",
    "  victoria-logs:",
    '    image: victoriametrics/victoria-logs:latest',
    "    volumes:",
    "      - ${STACK_STORAGE_ROOT}/victoria-logs:/vlogsdata",
    "",
    "  victoria-metrics:",
    '    image: victoriametrics/victoria-metrics:latest',
    "    volumes:",
    "      - ${STACK_STORAGE_ROOT}/victoria-metrics:/victoria-metrics-data",
    "      - ${STACK_STORAGE_ROOT}/victoria-metrics/promscrape.yml:/etc/victoria-metrics/promscrape.yml",
    "",
    "  victoria-traces:",
    '    image: victoriametrics/victoria-traces:latest',
    "    volumes:",
    "      - ${STACK_STORAGE_ROOT}/victoria-traces:/tracesdata",
    "",
    "volumes:",
    "  victoria-logs:",
    "  victoria-metrics:",
    "  victoria-traces:",
  ].join("\n");
}

