/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryMetrics } from "./query-metrics";

const fetchMock = vi.fn();

describe("queryMetrics", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("queries a PromQL range and normalizes the returned matrix", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          resultType: "matrix",
          result: [
            {
              metric: {
                __name__: "demo_app_startup_duration_ms",
                stack_id: "hld-2d2a19b8",
              },
              values: [
                [1_743_241_000, "742"],
                [1_743_241_060, "755"],
              ],
            },
          ],
        },
      }),
    });

    const result = await queryMetrics({
      endpoint: "http://127.0.0.1:18428/prometheus/api/v1/query_range",
      promql:
        'demo_app_startup_duration_ms{stack_id="hld-2d2a19b8",service="harness-legibility-demo"}',
      since: "2026-03-29T10:00:00.000Z",
      until: "2026-03-29T10:10:00.000Z",
      step: "60s",
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("query=");
    expect(decodeURIComponent(url)).toContain(
      'demo_app_startup_duration_ms{stack_id="hld-2d2a19b8",service="harness-legibility-demo"}',
    );
    expect(result).toEqual([
      {
        metric: {
          __name__: "demo_app_startup_duration_ms",
          stack_id: "hld-2d2a19b8",
        },
        values: [
          { timestamp: 1_743_241_000, value: 742 },
          { timestamp: 1_743_241_060, value: 755 },
        ],
      },
    ]);
  });

  it("throws when the metrics query fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "backend unavailable",
    });

    await expect(
      queryMetrics({
        endpoint: "http://127.0.0.1:18428/prometheus/api/v1/query",
        promql:
          'demo_app_startup_duration_ms{stack_id="hld-2d2a19b8",service="harness-legibility-demo"}',
      }),
    ).rejects.toThrow(
      "VictoriaMetrics query failed with status 503: backend unavailable",
    );
  });
});
