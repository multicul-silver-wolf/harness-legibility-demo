/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const registerOTelMock = vi.fn();

vi.mock("@vercel/otel", () => ({
  registerOTel: registerOTelMock,
}));

describe("instrumentation register", () => {
  afterEach(() => {
    registerOTelMock.mockReset();
    delete process.env.OTEL_SERVICE_NAME;
  });

  it("registers Vercel OTel with the default service name", async () => {
    const { register } = await import("../instrumentation");

    register();

    expect(registerOTelMock).toHaveBeenCalledWith({
      serviceName: "harness-legibility-demo",
    });
  });

  it("honors an explicit OTEL service name override", async () => {
    process.env.OTEL_SERVICE_NAME = "demo-worker";

    const { register } = await import("../instrumentation");

    register();

    expect(registerOTelMock).toHaveBeenCalledWith({
      serviceName: "demo-worker",
    });
  });
});
