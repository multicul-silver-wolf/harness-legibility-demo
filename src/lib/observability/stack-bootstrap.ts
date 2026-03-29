import type { StackContext } from "./stack-context";

export type VictoriaMetricsScrapeConfigInput = {
  appTarget: string;
};

export type LocalProcessPlan = {
  binaries: {
    logs: string;
    metrics: string;
    traces: string;
  };
  paths: {
    logsDataDir: string;
    metricsDataDir: string;
    tracesDataDir: string;
    promScrapeConfig: string;
    envFile: string;
    pidDir: string;
    logDir: string;
  };
  commands: {
    logs: string[];
    metrics: string[];
    traces: string[];
  };
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

export function buildLocalProcessPlan(context: StackContext): LocalProcessPlan {
  const paths = {
    logsDataDir: `${context.storageRoot}/victoria-logs`,
    metricsDataDir: `${context.storageRoot}/victoria-metrics`,
    tracesDataDir: `${context.storageRoot}/victoria-traces`,
    promScrapeConfig: `${context.storageRoot}/victoria-metrics/promscrape.yml`,
    envFile: `${context.storageRoot}/env`,
    pidDir: `${context.storageRoot}/pids`,
    logDir: `${context.storageRoot}/process-logs`,
  };

  const binaries = {
    logs: "victoria-logs-prod",
    metrics: "victoria-metrics-prod",
    traces: "victoria-traces-prod",
  };

  return {
    binaries,
    paths,
    commands: {
      logs: [
        binaries.logs,
        `-storageDataPath=${paths.logsDataDir}`,
        "-loggerLevel=INFO",
        "-httpListenAddr=:10528",
      ],
      metrics: [
        binaries.metrics,
        `-storageDataPath=${paths.metricsDataDir}`,
        `-promscrape.config=${paths.promScrapeConfig}`,
        "-selfScrapeInterval=5s",
        "-loggerLevel=INFO",
        "-httpListenAddr=:18428",
      ],
      traces: [
        binaries.traces,
        `-storageDataPath=${paths.tracesDataDir}`,
        "-loggerLevel=INFO",
        "-httpListenAddr=:11428",
      ],
    },
  };
}
