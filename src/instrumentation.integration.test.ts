/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recordStartupSignalMock = vi.fn();

vi.mock("../src/lib/observability/runtime", () => ({
  recordStartupSignal: recordStartupSignalMock,
}));

describe("instrumentation integration", () => {
  const originalEnv = {
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    OTEL_LOG_LEVEL: process.env.OTEL_LOG_LEVEL,
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    OTEL_EXPORTER_OTLP_TRACES_PROTOCOL:
      process.env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL,
    OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
  };

  beforeEach(() => {
    vi.resetModules();
    recordStartupSignalMock.mockReset();

    process.env.NEXT_RUNTIME = "nodejs";
    process.env.OTEL_LOG_LEVEL = "debug";
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT =
      "http://127.0.0.1:11428/insert/opentelemetry/v1/traces";
    process.env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL = "http/protobuf";
    process.env.OTEL_SERVICE_NAME = "harness-legibility-demo";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();

    process.env.NEXT_RUNTIME = originalEnv.NEXT_RUNTIME;
    process.env.OTEL_LOG_LEVEL = originalEnv.OTEL_LOG_LEVEL;
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT =
      originalEnv.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
    process.env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL =
      originalEnv.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL;
    process.env.OTEL_SERVICE_NAME = originalEnv.OTEL_SERVICE_NAME;
  });

  it("uses the configured OTLP traces exporter endpoint", async () => {
    const consoleMessages: string[] = [];
    const capture = (...parts: unknown[]) => {
      consoleMessages.push(parts.map((part) => String(part)).join(" "));
    };

    vi.spyOn(console, "debug").mockImplementation(capture);
    vi.spyOn(console, "info").mockImplementation(capture);
    vi.spyOn(console, "warn").mockImplementation(capture);
    vi.spyOn(console, "error").mockImplementation(capture);

    const { register } = await import("../instrumentation");

    await register();

    expect(recordStartupSignalMock).toHaveBeenCalledTimes(1);
    expect(consoleMessages.join("\n")).toContain(
      "http://127.0.0.1:11428/insert/opentelemetry/v1/traces",
    );
  });
});
