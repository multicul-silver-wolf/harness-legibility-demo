import { registerOTel } from "@vercel/otel";

import { getServiceName } from "./src/lib/observability/tracing";

export async function register() {
  registerOTel({
    serviceName: getServiceName(),
  });

  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { recordStartupSignal } = await import("./src/lib/observability/runtime");
  await recordStartupSignal();
}
