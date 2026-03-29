/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it } from "vitest";

import { recordAppStartup, resetMetrics } from "@/lib/observability/metrics";

import { GET } from "./route";

describe("GET /api/metrics", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("returns Prometheus text format for the current registry", async () => {
    recordAppStartup({
      service: "harness-legibility-demo",
      stackId: "hld-2d2a19b8",
      worktreeId: "harness-legibility-demo",
      durationMs: 742,
      success: true,
    });

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("demo_app_startup_duration_ms");
    expect(body).toContain('stack_id="hld-2d2a19b8"');
  });
});
