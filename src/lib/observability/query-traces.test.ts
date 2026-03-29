/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryTraces } from "./query-traces";

const fetchMock = vi.fn();

describe("queryTraces", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("queries the trace backend with structured filters and normalizes spans", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            traceID: "trace-123",
            spans: [
              {
                spanID: "span-root",
                operationName: "action.submit",
                startTime: 1_743_241_000_000,
                duration: 2_400,
                tags: [
                  { key: "journey", type: "string", value: "action.submit" },
                  { key: "route", type: "string", value: "/actions/submit" },
                ],
              },
            ],
          },
        ],
      }),
    });

    const result = await queryTraces({
      endpoint: "http://127.0.0.1:11428/select/jaeger/api/traces",
      filters: {
        service: "harness-legibility-demo",
        stackId: "hld-2d2a19b8",
        journey: "action.submit",
        minDurationMs: 2000,
      },
      since: "2026-03-29T10:00:00.000Z",
      until: "2026-03-29T10:10:00.000Z",
      limit: 10,
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("service=harness-legibility-demo");
    expect(url).toContain("tags=");
    expect(decodeURIComponent(url)).toContain(
      'tags={"stack_id":"hld-2d2a19b8","journey":"action.submit"}',
    );
    expect(url).toContain("minDuration=2000ms");
    expect(url).toContain("start=1774778400000000");
    expect(url).toContain("end=1774779000000000");
    expect(result).toEqual([
      {
        traceId: "trace-123",
        spans: [
          {
            spanId: "span-root",
            name: "action.submit",
            startTime: 1_743_241_000_000,
            durationMs: 2.4,
            attributes: {
              journey: "action.submit",
              route: "/actions/submit",
            },
          },
        ],
      },
    ]);
  });

  it("throws a helpful error when trace querying fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 504,
      text: async () => "query timeout",
    });

    await expect(
      queryTraces({
        endpoint: "http://127.0.0.1:11428/select/jaeger/api/traces",
        filters: {
          service: "harness-legibility-demo",
          stackId: "hld-2d2a19b8",
        },
      }),
    ).rejects.toThrow(
      "VictoriaTraces query failed with status 504: query timeout",
    );
  });
});
