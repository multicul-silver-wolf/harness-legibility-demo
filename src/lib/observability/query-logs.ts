export type LogQueryFilters = {
  stackId?: string;
  service?: string;
  level?: string;
  journey?: string;
  route?: string;
  messageIncludes?: string;
};

export type QueryLogsInput = {
  endpoint: string;
  filters: LogQueryFilters;
  since: string;
  until: string;
  limit?: number;
};

export type QueryLogRow = {
  message: string;
  timestamp: string;
  level?: string;
  attributes: Record<string, string>;
};

type VictoriaLogsHit = Record<string, unknown> & {
  _msg?: unknown;
  _time?: unknown;
};

type VictoriaLogsQueryResponse = {
  hits?: VictoriaLogsHit[];
};

const RESERVED_ATTRIBUTE_KEYS = new Set([
  "_msg",
  "_time",
  "_stream",
  "_stream_id",
  "_tenant_id",
  "message",
  "timestamp",
  "level",
]);

function escapeLogsqlLiteral(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function buildQuery(filters: LogQueryFilters): string {
  const clauses: string[] = [];

  if (filters.stackId) {
    clauses.push(`stack_id:"${escapeLogsqlLiteral(filters.stackId)}"`);
  }

  if (filters.service) {
    clauses.push(`service:"${escapeLogsqlLiteral(filters.service)}"`);
  }

  if (filters.level) {
    clauses.push(`level:"${escapeLogsqlLiteral(filters.level)}"`);
  }

  if (filters.journey) {
    clauses.push(`journey:"${escapeLogsqlLiteral(filters.journey)}"`);
  }

  if (filters.route) {
    clauses.push(`route:"${escapeLogsqlLiteral(filters.route)}"`);
  }

  if (filters.messageIncludes) {
    clauses.push(`"${escapeLogsqlLiteral(filters.messageIncludes)}"`);
  }

  return clauses.length > 0 ? `_time:5m AND ${clauses.join(" AND ")}` : `_time:5m`;
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function normalizeHit(hit: VictoriaLogsHit): QueryLogRow {
  const message = toStringValue(hit._msg ?? "");
  const timestamp = toStringValue(hit._time ?? "");
  const level = typeof hit.level === "string" ? hit.level : undefined;

  const attributes: Record<string, string> = {};

  for (const [key, value] of Object.entries(hit)) {
    if (RESERVED_ATTRIBUTE_KEYS.has(key)) {
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    attributes[key] = toStringValue(value);
  }

  return {
    message,
    timestamp,
    level,
    attributes,
  };
}

async function parseQueryResponse(response: Response): Promise<VictoriaLogsQueryResponse> {
  if (typeof response.json === "function") {
    return (await response.json()) as VictoriaLogsQueryResponse;
  }

  const text = typeof response.text === "function" ? await response.text() : "";

  try {
    return JSON.parse(text) as VictoriaLogsQueryResponse;
  } catch {
    const hits = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as VictoriaLogsHit);

    return { hits };
  }
}

export async function queryLogs(input: QueryLogsInput): Promise<QueryLogRow[]> {
  const query = buildQuery(input.filters);
  const url = new URL(input.endpoint);
  url.searchParams.set("query", query);
  url.searchParams.set("start", input.since);
  url.searchParams.set("end", input.until);

  if (typeof input.limit === "number") {
    url.searchParams.set("limit", String(input.limit));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`VictoriaLogs query failed with status ${response.status}: ${errorText}`);
  }

  const payload = await parseQueryResponse(response);
  const hits = Array.isArray(payload.hits) ? payload.hits : [];

  return hits.map(normalizeHit);
}
