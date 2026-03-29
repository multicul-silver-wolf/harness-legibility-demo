export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEventInput = {
  eventType: string;
  message?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  journey?: string;
  step?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  errorCode?: string;
  [key: string]: unknown;
};

export type AppLogger = {
  debug: (message: string, event?: Partial<LogEventInput>) => Promise<void>;
  info: (message: string, event?: Partial<LogEventInput>) => Promise<void>;
  warn: (message: string, event?: Partial<LogEventInput>) => Promise<void>;
  error: (message: string, event?: Partial<LogEventInput>) => Promise<void>;
};

export type AppLoggerOptions = {
  service: string;
  stackId: string;
  worktreeId: string;
  endpoint: string;
  fetchImpl?: typeof fetch;
};

type SerializedLogEvent = {
  ts: string;
  level: LogLevel;
  message: string;
  service: string;
  stack_id: string;
  worktree_id: string;
  event_type: string;
  route?: string;
  method?: string;
  status_code?: number;
  duration_ms?: number;
  journey?: string;
  step?: string;
  request_id?: string;
  trace_id?: string;
  span_id?: string;
  error_code?: string;
};

function toSnakeCaseEvent(input: {
  level: LogLevel;
  message: string;
  service: string;
  stackId: string;
  worktreeId: string;
} & Partial<LogEventInput>): SerializedLogEvent {
  const {
    level,
    message,
    service,
    stackId,
    worktreeId,
    eventType,
    statusCode,
    durationMs,
    requestId,
    traceId,
    spanId,
    errorCode,
    ...rest
  } = input;

  const event: SerializedLogEvent = {
    ts: new Date().toISOString(),
    level,
    message,
    service,
    stack_id: stackId,
    worktree_id: worktreeId,
    event_type: eventType ?? level,
  };

  if (rest.route !== undefined) {
    event.route = String(rest.route);
  }
  if (rest.method !== undefined) {
    event.method = String(rest.method);
  }
  if (statusCode !== undefined) {
    event.status_code = statusCode;
  }
  if (durationMs !== undefined) {
    event.duration_ms = durationMs;
  }
  if (rest.journey !== undefined) {
    event.journey = String(rest.journey);
  }
  if (rest.step !== undefined) {
    event.step = String(rest.step);
  }
  if (requestId !== undefined) {
    event.request_id = requestId;
  }
  if (traceId !== undefined) {
    event.trace_id = traceId;
  }
  if (spanId !== undefined) {
    event.span_id = spanId;
  }
  if (errorCode !== undefined) {
    event.error_code = errorCode;
  }

  return event;
}

async function writeEvent(
  options: AppLoggerOptions,
  level: LogLevel,
  message: string,
  event?: Partial<LogEventInput>,
) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("No fetch implementation available for VictoriaLogs ingestion");
  }

  const payload = toSnakeCaseEvent({
    level,
    message,
    service: options.service,
    stackId: options.stackId,
    worktreeId: options.worktreeId,
    ...event,
  });

  const response = await fetchImpl(options.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/stream+json",
    },
    body: `${JSON.stringify(payload)}\n`,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `VictoriaLogs ingestion failed with status ${response.status}: ${details}`,
    );
  }
}

export function createAppLogger(options: AppLoggerOptions): AppLogger {
  return {
    debug: (message, event) => writeEvent(options, "debug", message, event),
    info: (message, event) => writeEvent(options, "info", message, event),
    warn: (message, event) => writeEvent(options, "warn", message, event),
    error: (message, event) => writeEvent(options, "error", message, event),
  };
}
