import { registerOTel } from "@vercel/otel";

import { getServiceName } from "./src/lib/observability/tracing";

export function register() {
  registerOTel({
    serviceName: getServiceName(),
  });
}
