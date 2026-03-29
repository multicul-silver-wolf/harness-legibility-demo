/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppLogger } from "./logger";

const fetchMock = vi.fn();

describe("createAppLogger", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends newline-delimited structured logs to VictoriaLogs", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => "",
    });

    const logger = createAppLogger({
      service: "harness-legibility-demo",
      stackId: "hld-2d2a19b8",
      worktreeId: "harness-legibility-demo",
      endpoint: "http://127.0.0.1:10528/insert/jsonline",
    });

    await logger.info("startup complete", {
      eventType: "startup",
      durationMs: 742,
      route: "/",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:10528/insert/jsonline",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/stream+json",
        },
        body: expect.any(String),
      }),
    );

    const [, request] = fetchMock.mock.calls[0];
    expect(request.body).toContain('"message":"startup complete"');
    expect(request.body).toContain('"event_type":"startup"');
    expect(request.body).toContain('"level":"info"');
    expect(request.body).toContain('"stack_id":"hld-2d2a19b8"');
    expect(request.body).toContain('"worktree_id":"harness-legibility-demo"');
    expect(request.body).toContain('"service":"harness-legibility-demo"');
    expect(request.body).toContain('"duration_ms":742');
    expect(request.body).toContain('"route":"/"');
  });

  it("throws a helpful error when VictoriaLogs rejects the payload", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "bad payload",
    });

    const logger = createAppLogger({
      service: "harness-legibility-demo",
      stackId: "hld-2d2a19b8",
      worktreeId: "harness-legibility-demo",
      endpoint: "http://127.0.0.1:10528/insert/jsonline",
    });

    await expect(
      logger.error("startup failed", {
        eventType: "error",
        errorCode: "BOOT_FAILURE",
      }),
    ).rejects.toThrow(
      "VictoriaLogs ingestion failed with status 500: bad payload",
    );
  });
});
