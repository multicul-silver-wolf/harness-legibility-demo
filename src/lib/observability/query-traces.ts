export type TraceQueryFilters = {
  service?: string;
  stackId?: string;
  journey?: string;
  route?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  minDurationMs?: number;
};

export type QueryTracesInput = {
  endpoint: string;
  filters: TraceQueryFilters;
  since?: string;
  until?: string;
  limit?: number;
};

export type QueryTraceSpan = {
  spanId: string;
  name: string;
  startTime: number;
  durationMs: number;
  attributes: Record<string, string>;
};

export type QueryTraceResult = {
  traceId: string;
  spans: QueryTraceSpan[];
};

type TraceTag = {
  key?: unknown;
  value?: unknown;
};

type TraceApiSpan = {
  spanID?: unknown;
  operationName?: unknown;
  startTime?: unknown;
  duration?: unknown;
  tags?: unknown;
};

type TraceApiItem = {
  traceID?: unknown;
  spans?: unknown;
};

type TraceApiResponse = {
  data?: unknown;
};

function escapeQueryValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return JSON.stringify(value);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return Number.NaN;
}

function readErrorBody(response: Response): Promise<string> {
  return response
    .text()
    .then((text) => text.trim() || response.statusText || "unknown error")
    .catch(() => response.statusText || "unknown error");
}

function appendTag(url: URL, key: string, value: string): void {
  const current = url.searchParams.get("tags");
  const tags = current ? (JSON.parse(current) as Record<string, string>) : {};
  tags[key] = value;
  url.searchParams.set("tags", JSON.stringify(tags));
}

function toJaegerTimestamp(value: string): string {
  if (/^\d+$/.test(value)) {
    return value;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  return String(parsed * 1000);
}

function buildUrl(input: QueryTracesInput): URL {
  const url = new URL(input.endpoint);
  const { filters } = input;

  if (filters.service) {
    url.searchParams.set("service", filters.service);
  }

  if (filters.stackId) {
    appendTag(url, "stack_id", filters.stackId);
  }

  if (filters.journey) {
    appendTag(url, "journey", filters.journey);
  }

  if (filters.route) {
    appendTag(url, "route", filters.route);
  }

  if (filters.requestId) {
    appendTag(url, "request_id", filters.requestId);
  }

  if (filters.traceId) {
    appendTag(url, "trace_id", filters.traceId);
  }

  if (filters.spanId) {
    appendTag(url, "span_id", filters.spanId);
  }

  if (typeof filters.minDurationMs === "number") {
    url.searchParams.set("minDuration", `${filters.minDurationMs}ms`);
  }

  if (input.since) {
    url.searchParams.set("start", toJaegerTimestamp(input.since));
  }

  if (input.until) {
    url.searchParams.set("end", toJaegerTimestamp(input.until));
  }

  if (typeof input.limit === "number") {
    url.searchParams.set("limit", String(input.limit));
  }

  return url;
}

function normalizeAttributes(tags: unknown): Record<string, string> {
  if (!Array.isArray(tags)) {
    return {};
  }

  return tags.reduce<Record<string, string>>((attributes, tag) => {
    const typedTag = tag as TraceTag;
    const key = typeof typedTag.key === "string" ? typedTag.key : "";
    if (!key) {
      return attributes;
    }

    const value = typedTag.value;
    if (value === undefined || value === null) {
      return attributes;
    }

    attributes[key] = toStringValue(value);
    return attributes;
  }, {});
}

function normalizeSpan(span: TraceApiSpan): QueryTraceSpan {
  const startTime = toNumber(span.startTime);
  const durationMicros = toNumber(span.duration);

  return {
    spanId: typeof span.spanID === "string" ? span.spanID : "",
    name: typeof span.operationName === "string" ? span.operationName : "",
    startTime,
    durationMs: Number.isFinite(durationMicros) ? durationMicros / 1000 : Number.NaN,
    attributes: normalizeAttributes(span.tags),
  };
}

function normalizeTrace(item: TraceApiItem): QueryTraceResult {
  const traceId = typeof item.traceID === "string" ? item.traceID : "";
  const spans = Array.isArray(item.spans)
    ? item.spans.map((span) => normalizeSpan(span as TraceApiSpan))
    : [];

  return {
    traceId,
    spans,
  };
}

async function parseResponse(response: Response): Promise<TraceApiResponse> {
  if (typeof response.json === "function") {
    return (await response.json()) as TraceApiResponse;
  }

  const text = typeof response.text === "function" ? await response.text() : "";
  return JSON.parse(text) as TraceApiResponse;
}

export async function queryTraces(
  input: QueryTracesInput,
): Promise<QueryTraceResult[]> {
  const url = buildUrl(input);

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await readErrorBody(response);
    throw new Error(
      `VictoriaTraces query failed with status ${response.status}: ${errorBody}`,
    );
  }

  const payload = await parseResponse(response);
  const data = payload.data;

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => normalizeTrace(item as TraceApiItem));
}
