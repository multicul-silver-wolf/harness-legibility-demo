/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  recordAppStartup,
  recordHttpRequest,
  recordJourneyRun,
  renderMetrics,
  resetMetrics,
} from "./metrics";

describe("observability metrics", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("renders the v1 startup, request, and journey metrics with stack labels", async () => {
    recordAppStartup({
      service: "harness-legibility-demo",
      stackId: "hld-2d2a19b8",
      worktreeId: "harness-legibility-demo",
      durationMs: 742,
      success: true,
    });

    recordHttpRequest({
      service: "harness-legibility-demo",
      stackId: "hld-2d2a19b8",
      worktreeId: "harness-legibility-demo",
      route: "/",
      method: "GET",
      statusCode: 200,
      durationSeconds: 0.142,
      failed: false,
    });

    recordJourneyRun({
      service: "harness-legibility-demo",
      stackId: "hld-2d2a19b8",
      worktreeId: "harness-legibility-demo",
      journey: "home.initial_load",
      durationSeconds: 0.88,
      failed: false,
    });

    const metrics = await renderMetrics();

    expect(metrics).toContain(
      'demo_app_startup_duration_ms{service="harness-legibility-demo",stack_id="hld-2d2a19b8",worktree_id="harness-legibility-demo"} 742',
    );
    expect(metrics).toContain(
      'demo_app_startup_total{service="harness-legibility-demo",stack_id="hld-2d2a19b8",worktree_id="harness-legibility-demo"} 1',
    );
    expect(metrics).toContain(
      'demo_http_requests_total{method="GET",route="/",service="harness-legibility-demo",stack_id="hld-2d2a19b8",status_code="200",worktree_id="harness-legibility-demo"} 1',
    );
    expect(metrics).toContain(
      'demo_journey_runs_total{journey="home.initial_load",service="harness-legibility-demo",stack_id="hld-2d2a19b8",worktree_id="harness-legibility-demo"} 1',
    );
  });

  it("tracks failures separately for startup, requests, and journeys", async () => {
    recordAppStartup({
      service: "harness-legibility-demo",
      stackId: "hld-2d2a19b8",
      worktreeId: "harness-legibility-demo",
      durationMs: 1200,
      success: false,
    });

    recordHttpRequest({
      service: "harness-legibility-demo",
      stackId: "hld-2d2a19b8",
      worktreeId: "harness-legibility-demo",
      route: "/api/submit",
      method: "POST",
      statusCode: 500,
      durationSeconds: 1.2,
      failed: true,
    });

    recordJourneyRun({
      service: "harness-legibility-demo",
      stackId: "hld-2d2a19b8",
      worktreeId: "harness-legibility-demo",
      journey: "action.submit",
      durationSeconds: 2.4,
      failed: true,
    });

    const metrics = await renderMetrics();

    expect(metrics).toContain(
      'demo_app_startup_failures_total{service="harness-legibility-demo",stack_id="hld-2d2a19b8",worktree_id="harness-legibility-demo"} 1',
    );
    expect(metrics).toContain(
      'demo_http_request_errors_total{method="POST",route="/api/submit",service="harness-legibility-demo",stack_id="hld-2d2a19b8",status_code="500",worktree_id="harness-legibility-demo"} 1',
    );
    expect(metrics).toContain(
      'demo_journey_failures_total{journey="action.submit",service="harness-legibility-demo",stack_id="hld-2d2a19b8",worktree_id="harness-legibility-demo"} 1',
    );
  });
});
