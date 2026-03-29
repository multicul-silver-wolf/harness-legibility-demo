import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TddCycleDemo } from "./tdd-cycle-demo";

const fetchMock = vi.fn();

describe("TddCycleDemo", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    vi.stubGlobal("fetch", fetchMock);
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

    render(<TddCycleDemo />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/observability/journey");
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      journey: "home.initial_load",
      route: "/",
      step: "page-load",
      durationMs: 320,
    });

    await user.click(screen.getByRole("button", { name: "Advance cycle" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Green" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
      journey: "demo.component_interaction",
      route: "/",
      step: "advance-cycle",
      durationMs: 180,
    });

    await user.click(screen.getByRole("button", { name: "Advance cycle" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Refactor" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset to red" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Red" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(JSON.parse(fetchMock.mock.calls[3][1]?.body as string)).toEqual({
      journey: "diagnostics.view",
      route: "/",
      step: "reset-to-red",
      durationMs: 360,
    });

    await user.click(screen.getByRole("button", { name: "Submit action" }));
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(JSON.parse(fetchMock.mock.calls[4][1]?.body as string)).toEqual({
      journey: "action.submit",
      route: "/",
      step: "submit-action",
      durationMs: 480,
    });
  });
});
