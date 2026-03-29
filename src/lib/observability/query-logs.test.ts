/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryLogs } from "./query-logs";

const fetchMock = vi.fn();

describe("queryLogs", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("translates structured filters into a LogsQL query and normalizes rows", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        hits: [
          {
            _msg: "startup complete",
            _time: "2026-03-29T10:00:00.000Z",
            level: "info",
            stack_id: "hld-2d2a19b8",
            journey: "home.initial_load",
          },
        ],
      }),
    });

    const result = await queryLogs({
      endpoint: "http://127.0.0.1:10528/select/logsql/query",
      filters: {
        stackId: "hld-2d2a19b8",
        journey: "home.initial_load",
        level: "info",
        messageIncludes: "startup",
      },
      since: "2026-03-29T09:55:00.000Z",
      until: "2026-03-29T10:05:00.000Z",
      limit: 20,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("query=");
    expect(decodeURIComponent(url)).toContain('stack_id:"hld-2d2a19b8"');
    expect(decodeURIComponent(url)).toContain('journey:"home.initial_load"');
    expect(decodeURIComponent(url)).toContain('level:"info"');
    expect(decodeURIComponent(url)).toContain('"startup"');
    expect(result).toEqual([
      {
        message: "startup complete",
        timestamp: "2026-03-29T10:00:00.000Z",
        level: "info",
        attributes: {
          journey: "home.initial_load",
          stack_id: "hld-2d2a19b8",
        },
      },
    ]);
  });

  it("throws when the query endpoint fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "upstream unavailable",
    });

    await expect(
      queryLogs({
        endpoint: "http://127.0.0.1:10528/select/logsql/query",
        filters: {
          stackId: "hld-2d2a19b8",
        },
        since: "2026-03-29T09:55:00.000Z",
        until: "2026-03-29T10:05:00.000Z",
      }),
    ).rejects.toThrow(
      "VictoriaLogs query failed with status 502: upstream unavailable",
    );
  });
});
