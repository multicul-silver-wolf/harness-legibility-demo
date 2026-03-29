import { CANONICAL_JOURNEYS, type CanonicalJourney } from "./journeys";

export const CRITICAL_JOURNEYS = CANONICAL_JOURNEYS;

export type CriticalJourney = CanonicalJourney;

export type TraceIdentity = {
  service: string;
  stackId: string;
  worktreeId: string;
};

export type StartupTraceAttributesInput = TraceIdentity & {
  phase?: string;
};

export type JourneyTraceAttributesInput = TraceIdentity & {
  journey: CriticalJourney;
  route?: string;
  requestId?: string;
  uiStep?: string;
};

export type TraceAttributes = Record<string, string>;

export type TraceSpan = {
  spanId: string;
  name: string;
  startTime: number;
  durationMs: number;
  attributes: Record<string, string>;
};

export type TraceRecord = {
  traceId: string;
  spans: TraceSpan[];
};

export type QueryTracesFilters = {
  service?: string;
  stackId?: string;
  journey?: string;
  route?: string;
  minDurationMs?: number;
};

export type QueryTracesInput = {
  endpoint: string;
  filters: QueryTracesFilters;
  since?: string;
  until?: string;
  limit?: number;
};

type TraceQueryResponse = {
  data?: Array<{
    traceID?: unknown;
    spans?: Array<{
      spanID?: unknown;
      operationName?: unknown;
      startTime?: unknown;
      duration?: unknown;
      tags?: Array<{
        key?: unknown;
        value?: unknown;
      }>;
    }>;
  }>;
};

const DEFAULT_SERVICE_NAME = "harness-legibility-demo";

export function getServiceName(explicit?: string) {
  return explicit ?? process.env.OTEL_SERVICE_NAME ?? DEFAULT_SERVICE_NAME;
}

function toTraceAttributeValue(value: unknown) {
  return typeof value === "string" ? value : String(value);
}

function buildBaseAttributes(identity: TraceIdentity): TraceAttributes {
  return {
    "service.name": identity.service,
    stack_id: identity.stackId,
    worktree_id: identity.worktreeId,
  };
}

export function buildStartupTraceAttributes(
  input: StartupTraceAttributesInput,
): TraceAttributes {
  const attributes = buildBaseAttributes(input);
  attributes["trace.root"] = "app.startup";

  if (input.phase) {
    attributes.phase = input.phase;
  }

  return attributes;
}

export function buildJourneyTraceAttributes(
  input: JourneyTraceAttributesInput,
): TraceAttributes {
  const attributes = buildBaseAttributes(input);
  attributes.journey = input.journey;

  if (input.route) {
    attributes.route = input.route;
  }

  if (input.requestId) {
    attributes.request_id = input.requestId;
  }

  if (input.uiStep) {
    attributes["ui.step"] = input.uiStep;
  }

  return attributes;
}

export function buildTraceQueryTags(filters: QueryTracesFilters) {
  const pairs: string[] = [];

  if (filters.stackId) {
    pairs.push(`stack_id=${filters.stackId}`);
  }

  if (filters.journey) {
    pairs.push(`journey=${filters.journey}`);
  }

  if (filters.route) {
    pairs.push(`route=${filters.route}`);
  }

  return pairs.join(",");
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.trim() || response.statusText || "unknown error";
  } catch {
    return response.statusText || "unknown error";
  }
}

function toQueryUrl(input: QueryTracesInput): URL {
  const url = new URL(input.endpoint);

  if (input.filters.service) {
    url.searchParams.set("service", input.filters.service);
  }

  if (input.filters.stackId) {
    url.searchParams.set("stack_id", input.filters.stackId);
  }

  if (input.filters.journey) {
    url.searchParams.set("journey", input.filters.journey);
  }

  if (input.filters.route) {
    url.searchParams.set("route", input.filters.route);
  }

  if (typeof input.filters.minDurationMs === "number") {
    url.searchParams.set("min_duration_ms", String(input.filters.minDurationMs));
  }

  if (input.since) {
    url.searchParams.set("since", input.since);
  }

  if (input.until) {
    url.searchParams.set("until", input.until);
  }

  if (typeof input.limit === "number") {
    url.searchParams.set("limit", String(input.limit));
  }

  const tags = buildTraceQueryTags(input.filters);
  if (tags) {
    url.searchParams.set("tags", tags);
  }

  return url;
}

function normalizeTags(
  tags: Array<{
    key?: unknown;
    value?: unknown;
  }> | undefined,
) {
  const attributes: Record<string, string> = {};

  for (const tag of tags ?? []) {
    if (typeof tag.key !== "string" || tag.value === undefined || tag.value === null) {
      continue;
    }

    attributes[tag.key] = toTraceAttributeValue(tag.value);
  }

  return attributes;
}

export async function queryTraces(
  input: QueryTracesInput,
): Promise<TraceRecord[]> {
  const url = toQueryUrl(input);
  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await readErrorBody(response);
    throw new Error(`VictoriaTraces query failed with status ${response.status}: ${errorBody}`);
  }

  const payload = (await response.json()) as TraceQueryResponse;
  const traces = Array.isArray(payload.data) ? payload.data : [];

  return traces.map((trace) => {
    const spans = Array.isArray(trace.spans) ? trace.spans : [];

    return {
      traceId: toTraceAttributeValue(trace.traceID ?? ""),
      spans: spans.map((span) => ({
        spanId: toTraceAttributeValue(span.spanID ?? ""),
        name: toTraceAttributeValue(span.operationName ?? ""),
        startTime: Number(span.startTime ?? 0),
        durationMs: Number(span.duration ?? 0) / 1000,
        attributes: normalizeTags(span.tags),
      })),
    };
  });
}
