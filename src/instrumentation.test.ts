/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const registerOTelMock = vi.fn();
const recordStartupSignalMock = vi.fn();

vi.mock("@vercel/otel", () => ({
  registerOTel: registerOTelMock,
}));

vi.mock("../src/lib/observability/runtime", () => ({
  recordStartupSignal: recordStartupSignalMock,
}));

describe("instrumentation register", () => {
  afterEach(() => {
    registerOTelMock.mockReset();
    recordStartupSignalMock.mockReset();
    vi.resetModules();
    delete process.env.OTEL_SERVICE_NAME;
  });

  it("registers Vercel OTel with the default service name", async () => {
    const { register } = await import("../instrumentation");

    await register();

    expect(registerOTelMock).toHaveBeenCalledWith({
      serviceName: "harness-legibility-demo",
    });
    expect(recordStartupSignalMock).toHaveBeenCalledTimes(1);
  });

  it("honors an explicit OTEL service name override", async () => {
    process.env.OTEL_SERVICE_NAME = "demo-worker";

    const { register } = await import("../instrumentation");

    await register();

    expect(registerOTelMock).toHaveBeenCalledWith({
      serviceName: "demo-worker",
    });
    expect(recordStartupSignalMock).toHaveBeenCalledTimes(1);
  });
});
