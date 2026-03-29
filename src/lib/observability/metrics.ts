type BaseMetricLabels = {
  service: string;
  stackId: string;
  worktreeId: string;
};

type StartupMetricInput = BaseMetricLabels & {
  durationMs: number;
  success: boolean;
};

type HttpRequestMetricInput = BaseMetricLabels & {
  route: string;
  method: string;
  statusCode: number;
  durationSeconds: number;
  failed: boolean;
};

type JourneyMetricInput = BaseMetricLabels & {
  journey: string;
  durationSeconds: number;
  failed: boolean;
};

type MetricBucket = {
  labels: BaseMetricLabels;
  startup?: {
    durationMs: number;
    total: number;
    failures: number;
  };
  http?: {
    route: string;
    method: string;
    statusCode: number;
    requests: number;
    durationSeconds: number;
    errors: number;
  };
  journey?: {
    journey: string;
    runs: number;
    durationSeconds: number;
    failures: number;
  };
};

const registry = new Map<string, MetricBucket>();

function keyFor(labels: BaseMetricLabels) {
  return [labels.service, labels.stackId, labels.worktreeId].join("\u0000");
}

function labelsText(labels: Record<string, string>) {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}="${labels[key]}"`)
    .join(",");
}

function getBucket(labels: BaseMetricLabels) {
  const key = keyFor(labels);
  const existing = registry.get(key);
  if (existing) {
    return existing;
  }

  const created: MetricBucket = {
    labels,
  };
  registry.set(key, created);
  return created;
}

export function resetMetrics() {
  registry.clear();
}

export function recordAppStartup(input: StartupMetricInput) {
  const bucket = getBucket(input);
  bucket.startup = {
    durationMs: input.durationMs,
    total: (bucket.startup?.total ?? 0) + 1,
    failures: (bucket.startup?.failures ?? 0) + (input.success ? 0 : 1),
  };
}

export function recordHttpRequest(input: HttpRequestMetricInput) {
  const bucket = getBucket(input);
  const current = bucket.http ?? {
    route: input.route,
    method: input.method,
    statusCode: input.statusCode,
    requests: 0,
    durationSeconds: 0,
    errors: 0,
  };

  bucket.http = {
    route: input.route,
    method: input.method,
    statusCode: input.statusCode,
    requests: current.requests + 1,
    durationSeconds: current.durationSeconds + input.durationSeconds,
    errors: current.errors + (input.failed ? 1 : 0),
  };
}

export function recordJourneyRun(input: JourneyMetricInput) {
  const bucket = getBucket(input);
  const current = bucket.journey ?? {
    journey: input.journey,
    runs: 0,
    durationSeconds: 0,
    failures: 0,
  };

  bucket.journey = {
    journey: input.journey,
    runs: current.runs + 1,
    durationSeconds: current.durationSeconds + input.durationSeconds,
    failures: current.failures + (input.failed ? 1 : 0),
  };
}

function renderMetricLine(
  name: string,
  labels: Record<string, string>,
  value: number,
) {
  return `${name}{${labelsText(labels)}} ${value}`;
}

export async function renderMetrics() {
  const lines: string[] = [];

  for (const bucket of registry.values()) {
    if (bucket.startup) {
      const labels = {
        service: bucket.labels.service,
        stack_id: bucket.labels.stackId,
        worktree_id: bucket.labels.worktreeId,
      };
      lines.push(
        renderMetricLine("demo_app_startup_duration_ms", labels, bucket.startup.durationMs),
      );
      lines.push(
        renderMetricLine("demo_app_startup_total", labels, bucket.startup.total),
      );
      lines.push(
        renderMetricLine(
          "demo_app_startup_failures_total",
          labels,
          bucket.startup.failures,
        ),
      );
    }

    if (bucket.http) {
      const labels = {
        method: bucket.http.method,
        route: bucket.http.route,
        service: bucket.labels.service,
        stack_id: bucket.labels.stackId,
        status_code: String(bucket.http.statusCode),
        worktree_id: bucket.labels.worktreeId,
      };
      lines.push(renderMetricLine("demo_http_requests_total", labels, bucket.http.requests));
      lines.push(
        renderMetricLine(
          "demo_http_request_duration_seconds_sum",
          labels,
          bucket.http.durationSeconds,
        ),
      );
      lines.push(
        renderMetricLine("demo_http_request_errors_total", labels, bucket.http.errors),
      );
    }

    if (bucket.journey) {
      const labels = {
        journey: bucket.journey.journey,
        service: bucket.labels.service,
        stack_id: bucket.labels.stackId,
        worktree_id: bucket.labels.worktreeId,
      };
      lines.push(renderMetricLine("demo_journey_runs_total", labels, bucket.journey.runs));
      lines.push(
        renderMetricLine(
          "demo_journey_duration_seconds_sum",
          labels,
          bucket.journey.durationSeconds,
        ),
      );
      lines.push(
        renderMetricLine("demo_journey_failures_total", labels, bucket.journey.failures),
      );
    }
  }

  return lines.join("\n");
}
