export type QueryMetricsParams = {
  endpoint: string;
  promql: string;
  since?: string;
  until?: string;
  step?: string;
};

export type PromMetricLabels = Record<string, string>;

export type PromMatrixSeries = {
  metric: PromMetricLabels;
  values: Array<{
    timestamp: number;
    value: number;
  }>;
};

export type PromVectorSample = {
  metric: PromMetricLabels;
  timestamp: number;
  value: number;
};

export type PromScalarSample = {
  timestamp: number;
  value: number;
};

export type QueryMetricsResult =
  | PromMatrixSeries[]
  | PromVectorSample[]
  | PromScalarSample[];

type PrometheusApiResponse = {
  status?: string;
  error?: string;
  errorType?: string;
  data?: {
    resultType?: "matrix" | "vector" | "scalar";
    result?: unknown;
  };
};

type PromMatrixApiRow = {
  metric?: Record<string, unknown>;
  values?: Array<[number, string]>;
};

type PromVectorApiRow = {
  metric?: Record<string, unknown>;
  value?: [number, string];
};

type PromScalarApiRow = [number, string];

function toSeconds(isoTimestamp: string): string {
  const milliseconds = Date.parse(isoTimestamp);
  if (Number.isNaN(milliseconds)) {
    throw new Error(`Invalid ISO timestamp: ${isoTimestamp}`);
  }

  return String(milliseconds / 1000);
}

function buildUrl({
  endpoint,
  promql,
  since,
  until,
  step,
}: QueryMetricsParams): URL {
  const url = new URL(endpoint);
  url.searchParams.set("query", promql);

  if (url.pathname.endsWith("/query_range")) {
    if (since) {
      url.searchParams.set("start", toSeconds(since));
    }

    if (until) {
      url.searchParams.set("end", toSeconds(until));
    }

    if (step) {
      url.searchParams.set("step", step);
    }
  } else if (since || until) {
    url.searchParams.set("time", toSeconds(until ?? since ?? new Date().toISOString()));
  }

  return url;
}

function coerceLabels(metric?: Record<string, unknown>): PromMetricLabels {
  if (!metric) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metric).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function normalizeMatrix(result: unknown): PromMatrixSeries[] {
  if (!Array.isArray(result)) {
    return [];
  }

  return result.map((row) => {
    const typedRow = row as PromMatrixApiRow;
    const values = (typedRow.values ?? []).map(([timestamp, rawValue]) => ({
      timestamp,
      value: toNumber(rawValue),
    }));

    return {
      metric: coerceLabels(typedRow.metric),
      values,
    };
  });
}

function normalizeVector(result: unknown): PromVectorSample[] {
  if (!Array.isArray(result)) {
    return [];
  }

  return result.flatMap((row) => {
    const typedRow = row as PromVectorApiRow;
    if (!typedRow.value) {
      return [];
    }

    const [timestamp, rawValue] = typedRow.value;
    return [
      {
        metric: coerceLabels(typedRow.metric),
        timestamp,
        value: toNumber(rawValue),
      },
    ];
  });
}

function normalizeScalar(result: unknown): PromScalarSample[] {
  if (!Array.isArray(result) || result.length !== 2) {
    return [];
  }

  const [timestamp, rawValue] = result as PromScalarApiRow;
  return [
    {
      timestamp,
      value: toNumber(rawValue),
    },
  ];
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.trim() || response.statusText || "unknown error";
  } catch {
    return response.statusText || "unknown error";
  }
}

export async function queryMetrics(
  params: QueryMetricsParams,
): Promise<QueryMetricsResult> {
  const url = buildUrl(params);

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await readErrorBody(response);
    throw new Error(
      `VictoriaMetrics query failed with status ${response.status}: ${errorBody}`,
    );
  }

  const payload = (await response.json()) as PrometheusApiResponse;

  if (payload.status && payload.status !== "success") {
    const message = payload.error ?? payload.errorType ?? "unknown error";
    throw new Error(`VictoriaMetrics query failed: ${message}`);
  }

  const resultType = payload.data?.resultType;
  const result = payload.data?.result;

  if (resultType === "matrix") {
    return normalizeMatrix(result);
  }

  if (resultType === "vector") {
    return normalizeVector(result);
  }

  if (resultType === "scalar") {
    return normalizeScalar(result);
  }

  return [];
}
