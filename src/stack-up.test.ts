/**
 * @vitest-environment node
 */

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("stack-up.sh", () => {
  it("discovers Homebrew-style Victoria binaries and the repo-local traces binary without overrides", () => {
    const workspaceRoot = path.resolve(import.meta.dirname, "..");
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "stack-up-fixture-"));
    const repoRoot = path.join(fixtureRoot, "repo");
    const realRepoRoot = realpathSync(path.dirname(repoRoot));
    const scriptsDir = path.join(repoRoot, "scripts");
    const fakeBinDir = path.join(fixtureRoot, "bin");
    const localObservabilityBinDir = path.join(repoRoot, ".observability", "bin");

    mkdirSync(scriptsDir, { recursive: true });
    mkdirSync(fakeBinDir, { recursive: true });
    mkdirSync(localObservabilityBinDir, { recursive: true });

    copyFileSync(
      path.join(workspaceRoot, "scripts", "stack-up.sh"),
      path.join(scriptsDir, "stack-up.sh"),
    );
    chmodSync(path.join(scriptsDir, "stack-up.sh"), 0o755);

    const logsBin = path.join(fakeBinDir, "victoria-logs");
    const metricsBin = path.join(fakeBinDir, "victoria-metrics");
    const tracesBin = path.join(localObservabilityBinDir, "victoria-traces-prod");
    const curlShim = path.join(fakeBinDir, "curl");
    const unameShim = path.join(fakeBinDir, "uname");

    for (const binary of [logsBin, metricsBin, tracesBin]) {
      writeFileSync(
        binary,
        `#!/usr/bin/env bash
set -euo pipefail
exit 0
`,
      );
      chmodSync(binary, 0o755);
    }

    writeFileSync(
      curlShim,
      `#!/usr/bin/env bash
set -euo pipefail
exit 0
`,
    );
    chmodSync(curlShim, 0o755);

    writeFileSync(
      unameShim,
      `#!/usr/bin/env bash
set -euo pipefail
printf 'Linux\\n'
`,
    );
    chmodSync(unameShim, 0o755);

    const output = execFileSync("bash", ["scripts/stack-up.sh"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: `${fakeBinDir}:${process.env.PATH ?? ""}`,
      },
      encoding: "utf8",
    });

    const envFilePath = output
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("source "))
      ?.slice("source ".length);

    expect(output).toContain("stack up complete");
    expect(envFilePath).toBeTruthy();

    const envFile = readFileSync(envFilePath!, "utf8");
    const resolvedRepoRoot = path.join(realRepoRoot, "repo");

    expect(envFile).toContain("export VICTORIA_LOGS_BIN=victoria-logs");
    expect(envFile).toContain("export VICTORIA_METRICS_BIN=victoria-metrics");
    expect(envFile).toContain(
      `export VICTORIA_TRACES_BIN=${path.join(resolvedRepoRoot, ".observability", "bin", "victoria-traces-prod")}`,
    );
  });
});
