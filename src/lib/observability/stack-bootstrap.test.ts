/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";

import { createStackContext } from "./stack-context";
import {
  buildAppObservabilityEnv,
  renderDockerComposeTemplate,
  renderVictoriaMetricsScrapeConfig,
} from "./stack-bootstrap";

describe("stack bootstrap helpers", () => {
  it("builds app env exports for the current worktree stack", () => {
    const context = createStackContext({
      cwd: "/Users/openclaw/projects/Playground/harness-legibility-demo",
      service: "harness-legibility-demo",
    });

    const env = buildAppObservabilityEnv(context);

    expect(env).toContain("STACK_ID=hld-2d2a19b8");
    expect(env).toContain("WORKTREE_ID=harness-legibility-demo");
    expect(env).toContain("OTEL_SERVICE_NAME=harness-legibility-demo");
    expect(env).toContain(
      "OBSERVABILITY_LOGS_ENDPOINT=http://127.0.0.1:10528/insert/jsonline?_stream_fields=service,stack_id,worktree_id,level,event_type",
    );
    expect(env).toContain(
      "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://127.0.0.1:11428/insert/opentelemetry/v1/traces",
    );
  });

  it("renders a VictoriaMetrics scrape config for the Next.js metrics route", () => {
    const config = renderVictoriaMetricsScrapeConfig({
      appTarget: "host.docker.internal:3000",
    });

    expect(config).toContain("job_name: nextjs-app");
    expect(config).toContain("metrics_path: /api/metrics");
    expect(config).toContain("- host.docker.internal:3000");
  });

  it("renders a compose template with the three Victoria services and stack volumes", () => {
    const compose = renderDockerComposeTemplate();

    expect(compose).toContain("victoria-logs:");
    expect(compose).toContain("victoria-metrics:");
    expect(compose).toContain("victoria-traces:");
    expect(compose).toContain("${STACK_STORAGE_ROOT}/victoria-logs");
    expect(compose).toContain("${STACK_STORAGE_ROOT}/victoria-metrics");
    expect(compose).toContain("${STACK_STORAGE_ROOT}/victoria-traces");
    expect(compose).toContain("${STACK_STORAGE_ROOT}/victoria-metrics/promscrape.yml");
  });
});
