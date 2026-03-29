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

type StartupBucket = {
  labels: BaseMetricLabels;
  durationMs: number;
  total: number;
  failures: number;
};

type HttpBucket = {
  labels: BaseMetricLabels & {
    route: string;
    method: string;
    statusCode: number;
  };
  requests: number;
  durationSeconds: number;
  errors: number;
};

type JourneyBucket = {
  labels: BaseMetricLabels & {
    journey: string;
  };
  runs: number;
  durationSeconds: number;
  failures: number;
};

type MetricRegistry = {
  startup: Map<string, StartupBucket>;
  http: Map<string, HttpBucket>;
  journey: Map<string, JourneyBucket>;
};

type MetricsGlobal = typeof globalThis & {
  __HARNESS_OBSERVABILITY_METRICS__?: MetricRegistry;
};

const metricsGlobal = globalThis as MetricsGlobal;
const registry =
  metricsGlobal.__HARNESS_OBSERVABILITY_METRICS__ ??
  (metricsGlobal.__HARNESS_OBSERVABILITY_METRICS__ = {
    startup: new Map<string, StartupBucket>(),
    http: new Map<string, HttpBucket>(),
    journey: new Map<string, JourneyBucket>(),
  });

function labelsText(labels: Record<string, string>) {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}="${labels[key]}"`)
    .join(",");
}

function baseKey(labels: BaseMetricLabels) {
  return [labels.service, labels.stackId, labels.worktreeId].join("\u0000");
}

function httpKey(input: HttpRequestMetricInput) {
  return [
    baseKey(input),
    input.route,
    input.method,
    String(input.statusCode),
  ].join("\u0000");
}

function journeyKey(input: JourneyMetricInput) {
  return [baseKey(input), input.journey].join("\u0000");
}

export function resetMetrics() {
  registry.startup.clear();
  registry.http.clear();
  registry.journey.clear();
}

export function recordAppStartup(input: StartupMetricInput) {
  const key = baseKey(input);
  const current = registry.startup.get(key);

  registry.startup.set(key, {
    labels: {
      service: input.service,
      stackId: input.stackId,
      worktreeId: input.worktreeId,
    },
    durationMs: input.durationMs,
    total: (current?.total ?? 0) + 1,
    failures: (current?.failures ?? 0) + (input.success ? 0 : 1),
  });
}

export function recordHttpRequest(input: HttpRequestMetricInput) {
  const key = httpKey(input);
  const current = registry.http.get(key);

  registry.http.set(key, {
    labels: {
      service: input.service,
      stackId: input.stackId,
      worktreeId: input.worktreeId,
      route: input.route,
      method: input.method,
      statusCode: input.statusCode,
    },
    requests: (current?.requests ?? 0) + 1,
    durationSeconds: (current?.durationSeconds ?? 0) + input.durationSeconds,
    errors: (current?.errors ?? 0) + (input.failed ? 1 : 0),
  });
}

export function recordJourneyRun(input: JourneyMetricInput) {
  const key = journeyKey(input);
  const current = registry.journey.get(key);

  registry.journey.set(key, {
    labels: {
      service: input.service,
      stackId: input.stackId,
      worktreeId: input.worktreeId,
      journey: input.journey,
    },
    runs: (current?.runs ?? 0) + 1,
    durationSeconds: (current?.durationSeconds ?? 0) + input.durationSeconds,
    failures: (current?.failures ?? 0) + (input.failed ? 1 : 0),
  });
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

  for (const bucket of registry.startup.values()) {
    const labels = {
      service: bucket.labels.service,
      stack_id: bucket.labels.stackId,
      worktree_id: bucket.labels.worktreeId,
    };
    lines.push(renderMetricLine("demo_app_startup_duration_ms", labels, bucket.durationMs));
    lines.push(renderMetricLine("demo_app_startup_total", labels, bucket.total));
    lines.push(
      renderMetricLine("demo_app_startup_failures_total", labels, bucket.failures),
    );
  }

  for (const bucket of registry.http.values()) {
    const labels = {
      method: bucket.labels.method,
      route: bucket.labels.route,
      service: bucket.labels.service,
      stack_id: bucket.labels.stackId,
      status_code: String(bucket.labels.statusCode),
      worktree_id: bucket.labels.worktreeId,
    };
    lines.push(renderMetricLine("demo_http_requests_total", labels, bucket.requests));
    lines.push(
      renderMetricLine(
        "demo_http_request_duration_seconds_sum",
        labels,
        bucket.durationSeconds,
      ),
    );
    lines.push(
      renderMetricLine("demo_http_request_errors_total", labels, bucket.errors),
    );
  }

  for (const bucket of registry.journey.values()) {
    const labels = {
      journey: bucket.labels.journey,
      service: bucket.labels.service,
      stack_id: bucket.labels.stackId,
      worktree_id: bucket.labels.worktreeId,
    };
    lines.push(renderMetricLine("demo_journey_runs_total", labels, bucket.runs));
    lines.push(
      renderMetricLine(
        "demo_journey_duration_seconds_sum",
        labels,
        bucket.durationSeconds,
      ),
    );
    lines.push(
      renderMetricLine("demo_journey_failures_total", labels, bucket.failures),
    );
  }

  return lines.join("\n");
}
