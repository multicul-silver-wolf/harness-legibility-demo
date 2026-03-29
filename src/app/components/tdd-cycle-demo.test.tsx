import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TddCycleDemo } from "./tdd-cycle-demo";

describe("TddCycleDemo", () => {
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

  it("moves through the TDD cycle and can reset", async () => {
    const user = userEvent.setup();

    render(<TddCycleDemo />);

    await user.click(screen.getByRole("button", { name: "Advance cycle" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Green" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Advance cycle" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Refactor" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset to red" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Red" }),
    ).toBeInTheDocument();
  });
});
