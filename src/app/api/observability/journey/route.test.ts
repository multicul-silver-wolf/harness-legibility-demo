/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const recordJourneySignalMock = vi.fn();

vi.mock("@/lib/observability/runtime", () => ({
  recordJourneySignal: recordJourneySignalMock,
}));

describe("POST /api/observability/journey", () => {
  afterEach(() => {
    recordJourneySignalMock.mockReset();
    vi.resetModules();
  });

  it("records a canonical journey and returns the resulting envelope", async () => {
    recordJourneySignalMock.mockResolvedValue({
      requestId: "req-123",
      durationMs: 360,
      statusCode: 200,
      failed: false,
    });

    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/observability/journey", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          journey: "diagnostics.view",
          route: "/",
          step: "open-panel",
          durationMs: 360,
        }),
      }),
    );

    expect(recordJourneySignalMock).toHaveBeenCalledWith({
      journey: "diagnostics.view",
      route: "/",
      step: "open-panel",
      durationMs: 360,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      requestId: "req-123",
      durationMs: 360,
      statusCode: 200,
      failed: false,
    });
  });

  it("rejects unknown journeys with a 400 response", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/observability/journey", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          journey: "unknown",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_journey",
    });
  });
});
