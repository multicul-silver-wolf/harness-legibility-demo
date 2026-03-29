/**
 * @vitest-environment node
 */

import path from "node:path";
import { describe, expect, it } from "vitest";

import { createStackContext } from "./stack-context";

describe("createStackContext", () => {
  it("builds a deterministic local stack identity from the worktree path", () => {
    const context = createStackContext({
      cwd: "/Users/openclaw/projects/Playground/harness-legibility-demo",
      service: "harness-legibility-demo",
    });

    expect(context.stackId).toBe("hld-2d2a19b8");
    expect(context.worktreeId).toBe("harness-legibility-demo");
    expect(context.service).toBe("harness-legibility-demo");
    expect(context.composeProjectName).toBe("hld_2d2a19b8");
    expect(context.storageRoot).toBe(
      path.join(
        "/Users/openclaw/projects/Playground/harness-legibility-demo",
        ".observability",
        "hld-2d2a19b8",
      ),
    );
    expect(context.endpoints.logsIngestUrl).toBe(
      "http://127.0.0.1:10528/insert/jsonline?_stream_fields=service,stack_id,worktree_id,level,event_type",
    );
    expect(context.endpoints.metricsBaseUrl).toBe("http://127.0.0.1:18428");
    expect(context.endpoints.tracesBaseUrl).toBe("http://127.0.0.1:11428");
  });

  it("honors an explicit stack id override for repeatable automation runs", () => {
    const context = createStackContext({
      cwd: "/tmp/demo/worktrees/feature-a",
      service: "demo-app",
      stackId: "hld-fixed-stack",
    });

    expect(context.stackId).toBe("hld-fixed-stack");
    expect(context.composeProjectName).toBe("hld_fixed_stack");
    expect(context.storageRoot).toBe(
      path.join("/tmp/demo/worktrees/feature-a", ".observability", "hld-fixed-stack"),
    );
  });
});
