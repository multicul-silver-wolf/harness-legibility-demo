/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";

import {
  buildJourneyTraceAttributes,
  buildStartupTraceAttributes,
  CRITICAL_JOURNEYS,
  getServiceName,
} from "./tracing";

describe("tracing helpers", () => {
  it("exposes the canonical v1 journey identifiers", () => {
    expect(CRITICAL_JOURNEYS).toEqual([
      "home.initial_load",
      "demo.component_interaction",
      "diagnostics.view",
      "action.submit",
    ]);
  });

  it("builds startup trace attributes for the active stack", () => {
    expect(
      buildStartupTraceAttributes({
        service: "harness-legibility-demo",
        stackId: "hld-2d2a19b8",
        worktreeId: "harness-legibility-demo",
        phase: "app.ready",
      }),
    ).toEqual({
      "service.name": "harness-legibility-demo",
      stack_id: "hld-2d2a19b8",
      worktree_id: "harness-legibility-demo",
      phase: "app.ready",
      "trace.root": "app.startup",
    });
  });

  it("builds journey trace attributes with optional request metadata", () => {
    expect(
      buildJourneyTraceAttributes({
        service: "harness-legibility-demo",
        stackId: "hld-2d2a19b8",
        worktreeId: "harness-legibility-demo",
        journey: "action.submit",
        route: "/actions/submit",
        requestId: "req-42",
        uiStep: "submit-click",
      }),
    ).toEqual({
      "service.name": "harness-legibility-demo",
      stack_id: "hld-2d2a19b8",
      worktree_id: "harness-legibility-demo",
      journey: "action.submit",
      route: "/actions/submit",
      request_id: "req-42",
      "ui.step": "submit-click",
    });
  });

  it("resolves the OTEL service name with a stable default", () => {
    expect(getServiceName()).toBe("harness-legibility-demo");
    expect(getServiceName("custom-service")).toBe("custom-service");
  });
});
