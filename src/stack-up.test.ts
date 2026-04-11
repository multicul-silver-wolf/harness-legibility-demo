/**
 * @vitest-environment node
 */

import { execFileSync } from "node:child_process";
import {
  accessSync,
  chmodSync,
  copyFileSync,
  constants,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readExport(envFile: string, key: string) {
  const prefix = `export ${key}=`;
  const line = envFile
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  expect(line).toBeTruthy();
  return line!.slice(prefix.length);
}

function resolveExecutable(binary: string, searchPath: string) {
  if (binary.includes(path.sep)) {
    accessSync(binary, constants.X_OK);
    return binary;
  }

  for (const directory of searchPath.split(path.delimiter)) {
    if (!directory) {
      continue;
    }

    const candidate = path.join(directory, binary);

    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {}
  }

  throw new Error(`Unable to resolve executable for ${binary}`);
}

describe("stack-up.sh", () => {
  it("discovers runnable Victoria binaries without locking the env file to one source layout", () => {
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
    const pathValue = `${fakeBinDir}:${process.env.PATH ?? ""}`;
    const logsBinary = readExport(envFile, "VICTORIA_LOGS_BIN");
    const metricsBinary = readExport(envFile, "VICTORIA_METRICS_BIN");
    const tracesBinary = readExport(envFile, "VICTORIA_TRACES_BIN");

    expect(path.basename(resolveExecutable(logsBinary, pathValue))).toBe(
      "victoria-logs",
    );
    expect(path.basename(resolveExecutable(metricsBinary, pathValue))).toBe(
      "victoria-metrics",
    );
    expect(tracesBinary).toBe(
      path.join(resolvedRepoRoot, ".observability", "bin", "victoria-traces-prod"),
    );
    expect(resolveExecutable(tracesBinary, pathValue)).toBe(tracesBinary);
  });
});
