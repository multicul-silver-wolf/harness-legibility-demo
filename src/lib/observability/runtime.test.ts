/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderMetrics, resetMetrics } from "./metrics";

describe("observability runtime", () => {
  const logsEndpoint =
    "http://127.0.0.1:10528/insert/jsonline?_stream_fields=service,stack_id,worktree_id,level,event_type";

  beforeEach(() => {
    resetMetrics();
    vi.resetModules();
    process.env.STACK_ID = "stack-test";
    process.env.WORKTREE_ID = "worktree-test";
    process.env.OTEL_SERVICE_NAME = "harness-legibility-demo";
    process.env.OBSERVABILITY_LOGS_ENDPOINT = logsEndpoint;
  });

  afterEach(() => {
    resetMetrics();
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.STACK_ID;
    delete process.env.WORKTREE_ID;
    delete process.env.OTEL_SERVICE_NAME;
    delete process.env.OBSERVABILITY_LOGS_ENDPOINT;
  });

  it("records a journey without falling over when log ingestion succeeds", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url === logsEndpoint) {
        return new Response(null, {
          status: 204,
        });
      }

      throw new Error(`unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { recordJourneySignal } = await import("./runtime");

    await expect(
      recordJourneySignal({
        journey: "diagnostics.view",
        route: "/",
        step: "open-panel",
        durationMs: 360,
      }),
    ).resolves.toEqual({
      requestId: expect.any(String),
      durationMs: 360,
      statusCode: 200,
      failed: false,
    });

    const metrics = await renderMetrics();
    expect(metrics).toContain(
      'demo_journey_runs_total{journey="diagnostics.view",service="harness-legibility-demo",stack_id="stack-test",worktree_id="worktree-test"} 1',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      logsEndpoint,
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
