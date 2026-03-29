import { randomUUID } from "node:crypto";

import { SpanStatusCode, trace } from "@opentelemetry/api";

import { createAppLogger } from "./logger";
import { recordAppStartup, recordHttpRequest, recordJourneyRun } from "./metrics";
import { createStackContext, type StackContext } from "./stack-context";
import {
  buildJourneyTraceAttributes,
  buildStartupTraceAttributes,
  getServiceName,
  type CriticalJourney,
} from "./tracing";

type JourneySignalInput = {
  journey: CriticalJourney;
  route?: string;
  step?: string;
  durationMs?: number;
  failed?: boolean;
  statusCode?: number;
  requestId?: string;
};

type JourneySignalResult = {
  requestId: string;
  durationMs: number;
  statusCode: number;
  failed: boolean;
};

const startupAnchor = Date.now();

let stackContext: StackContext | undefined;
let startupRecorded = false;

function getContext() {
  if (stackContext) {
    return stackContext;
  }

  stackContext = createStackContext({
    cwd: process.cwd(),
    service: getServiceName(),
    stackId: process.env.STACK_ID,
    worktreeId: process.env.WORKTREE_ID,
  });

  return stackContext;
}

function getLogger() {
  const context = getContext();

  return createAppLogger({
    service: context.service,
    stackId: context.stackId,
    worktreeId: context.worktreeId,
    endpoint: process.env.OBSERVABILITY_LOGS_ENDPOINT ?? context.endpoints.logsIngestUrl,
  });
}

export async function recordStartupSignal() {
  if (startupRecorded) {
    return;
  }

  startupRecorded = true;

  const context = getContext();
  const durationMs = Math.max(1, Date.now() - startupAnchor);

  recordAppStartup({
    service: context.service,
    stackId: context.stackId,
    worktreeId: context.worktreeId,
    durationMs,
    success: true,
  });

  const now = Date.now();
  const tracer = trace.getTracer(context.service);
  const span = tracer.startSpan("app.startup", {
    attributes: buildStartupTraceAttributes({
      service: context.service,
      stackId: context.stackId,
      worktreeId: context.worktreeId,
      phase: "register",
    }),
    startTime: new Date(now - durationMs),
  });

  span.setStatus({
    code: SpanStatusCode.OK,
  });
  span.end(new Date(now));

  await getLogger().info("startup complete", {
    durationMs,
    eventType: "app.startup",
    route: "startup",
  });
}

export async function recordJourneySignal(
  input: JourneySignalInput,
): Promise<JourneySignalResult> {
  const context = getContext();
  const durationMs = input.durationMs ?? 240;
  const requestId = input.requestId ?? randomUUID();
  const failed = input.failed ?? false;
  const statusCode = input.statusCode ?? (failed ? 500 : 200);
  const route = input.route ?? "/";

  recordJourneyRun({
    service: context.service,
    stackId: context.stackId,
    worktreeId: context.worktreeId,
    journey: input.journey,
    durationSeconds: durationMs / 1000,
    failed,
  });

  recordHttpRequest({
    service: context.service,
    stackId: context.stackId,
    worktreeId: context.worktreeId,
    route: "/api/observability/journey",
    method: "POST",
    statusCode,
    durationSeconds: durationMs / 1000,
    failed,
  });

  const tracer = trace.getTracer(context.service);
  const now = Date.now();
  const span = tracer.startSpan(input.journey, {
    attributes: buildJourneyTraceAttributes({
      service: context.service,
      stackId: context.stackId,
      worktreeId: context.worktreeId,
      journey: input.journey,
      requestId,
      route,
      uiStep: input.step,
    }),
    startTime: new Date(now - durationMs),
  });

  span.setStatus({
    code: failed ? SpanStatusCode.ERROR : SpanStatusCode.OK,
  });
  span.end(new Date(now));

  const logger = getLogger();
  const logMethod = failed ? logger.error : logger.info;

  await logMethod(`${input.journey} observed`, {
    durationMs,
    eventType: failed ? "journey.failed" : "journey.completed",
    journey: input.journey,
    requestId,
    route,
    statusCode,
    step: input.step,
  });

  return {
    requestId,
    durationMs,
    statusCode,
    failed,
  };
}
