import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderMetrics, resetMetrics } from "@/lib/observability/metrics";

import { TddCycleDemo } from "./tdd-cycle-demo";

describe("TddCycleDemo", () => {
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

  it("starts on the red phase", () => {
    render(<TddCycleDemo />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Red" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Write a failing test that captures the next behavior you want.",
      ),
    ).toBeInTheDocument();
  });

  it("records the initial load and both button journeys", async () => {
    const user = userEvent.setup();
    const journeyResponses: number[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url === "/api/observability/journey") {
          const { POST } = await import("../api/observability/journey/route");
          const response = await POST(
            new Request("http://127.0.0.1:3000/api/observability/journey", {
              method: init?.method ?? "POST",
              headers: init?.headers,
              body: init?.body,
            }),
          );

          journeyResponses.push(response.status);
          return response;
        }

        if (url === logsEndpoint) {
          return new Response(null, {
            status: 204,
          });
        }

        throw new Error(`unexpected fetch: ${url}`);
      },
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<TddCycleDemo />);

    await waitFor(() => {
      expect(journeyResponses).toHaveLength(1);
    });

    expect(journeyResponses[0]).toBe(200);

    await user.click(screen.getByRole("button", { name: "Advance cycle" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Green" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(journeyResponses).toHaveLength(2);
    });

    await user.click(screen.getByRole("button", { name: "Advance cycle" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Refactor" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(journeyResponses).toHaveLength(3);
    });

    await user.click(screen.getByRole("button", { name: "Reset to red" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Red" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(journeyResponses).toHaveLength(4);
    });

    await user.click(screen.getByRole("button", { name: "Submit action" }));
    await waitFor(() => {
      expect(journeyResponses).toHaveLength(5);
    });

    expect(journeyResponses).toEqual([200, 200, 200, 200, 200]);

    const metrics = await renderMetrics();
    expect(metrics).toContain(
      'demo_journey_runs_total{journey="home.initial_load",service="harness-legibility-demo",stack_id="stack-test",worktree_id="worktree-test"} 1',
    );
    expect(metrics).toContain(
      'demo_journey_runs_total{journey="demo.component_interaction",service="harness-legibility-demo",stack_id="stack-test",worktree_id="worktree-test"} 2',
    );
    expect(metrics).toContain(
      'demo_journey_runs_total{journey="diagnostics.view",service="harness-legibility-demo",stack_id="stack-test",worktree_id="worktree-test"} 1',
    );
    expect(metrics).toContain(
      'demo_journey_runs_total{journey="action.submit",service="harness-legibility-demo",stack_id="stack-test",worktree_id="worktree-test"} 1',
    );
  });
});
