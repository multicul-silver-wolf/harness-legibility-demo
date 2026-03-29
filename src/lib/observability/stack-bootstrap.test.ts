/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";

import { createStackContext } from "./stack-context";
import {
  buildAppObservabilityEnv,
  buildLocalProcessPlan,
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
      appTarget: "127.0.0.1:3000",
    });

    expect(config).toContain("job_name: nextjs-app");
    expect(config).toContain("metrics_path: /api/metrics");
    expect(config).toContain("- 127.0.0.1:3000");
  });

  it("builds a local process plan for the three Victoria binaries", () => {
    const context = createStackContext({
      cwd: "/Users/openclaw/projects/Playground/harness-legibility-demo",
      service: "harness-legibility-demo",
    });

    const plan = buildLocalProcessPlan(context);

    expect(plan.binaries).toEqual({
      logs: "victoria-logs-prod",
      metrics: "victoria-metrics-prod",
      traces: "victoria-traces-prod",
    });
    expect(plan.paths.logsDataDir).toContain(
      ".observability/hld-2d2a19b8/victoria-logs",
    );
    expect(plan.paths.metricsDataDir).toContain(
      ".observability/hld-2d2a19b8/victoria-metrics",
    );
    expect(plan.paths.tracesDataDir).toContain(
      ".observability/hld-2d2a19b8/victoria-traces",
    );
    expect(plan.paths.promScrapeConfig).toContain(
      ".observability/hld-2d2a19b8/victoria-metrics/promscrape.yml",
    );
    expect(plan.commands.logs.join(" ")).toContain("-httpListenAddr=:10528");
    expect(plan.commands.metrics.join(" ")).toContain("-httpListenAddr=:18428");
    expect(plan.commands.traces.join(" ")).toContain("-httpListenAddr=:11428");
  });
});
