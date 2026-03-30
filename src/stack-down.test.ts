/**
 * @vitest-environment node
 */

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

function deriveStackId(cwd: string) {
  const normalized = realpathSync(cwd).replace(/\\/g, "/");
  let hash = 0x811c9dc5;

  for (const char of normalized) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  const stackIdSalt = 0x4ab61fa5;
  return `hld-${((hash ^ stackIdSalt) >>> 0).toString(16).padStart(8, "0")}`;
}

describe("stack-down.sh", () => {
  it("retries removing the stack storage when rm initially reports a non-empty directory", () => {
    const workspaceRoot = path.resolve(import.meta.dirname, "..");
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "stack-down-fixture-"));
    const repoRoot = path.join(fixtureRoot, "repo");
    const realRepoRoot = realpathSync(path.dirname(repoRoot));
    const scriptsDir = path.join(repoRoot, "scripts");
    const fakeBinDir = path.join(fixtureRoot, "bin");
    mkdirSync(scriptsDir, { recursive: true });
    mkdirSync(fakeBinDir, { recursive: true });

    copyFileSync(
      path.join(workspaceRoot, "scripts", "stack-down.sh"),
      path.join(scriptsDir, "stack-down.sh"),
    );
    chmodSync(path.join(scriptsDir, "stack-down.sh"), 0o755);

    const stackId = deriveStackId(repoRoot);
    const storageRoot = path.join(realRepoRoot, "repo", ".observability", stackId);
    mkdirSync(path.join(storageRoot, "victoria-metrics", "cache"), { recursive: true });
    writeFileSync(
      path.join(storageRoot, "victoria-metrics", "cache", "rollupResult"),
      "cache",
    );

    const rmShimPath = path.join(fakeBinDir, "rm");
    const rmStatePath = path.join(fixtureRoot, "rm-state");
    writeFileSync(
      rmShimPath,
      `#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ge 2 && "$1" == "-rf" && "$2" == "${storageRoot}" && ! -f "${rmStatePath}" ]]; then
  touch "${rmStatePath}"
  printf 'rm: %s/victoria-metrics: Directory not empty\\n' "${storageRoot}" >&2
  printf 'rm: %s: Directory not empty\\n' "${storageRoot}" >&2
  exit 1
fi

exec /bin/rm "$@"
`,
    );
    chmodSync(rmShimPath, 0o755);

    execFileSync("bash", ["scripts/stack-down.sh"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PATH: `${fakeBinDir}:${process.env.PATH ?? ""}`,
      },
      encoding: "utf8",
    });

    expect(existsSync(storageRoot)).toBe(false);
    expect(existsSync(rmStatePath)).toBe(true);
  });

  it("still removes the storage root in the normal case", () => {
    const workspaceRoot = path.resolve(import.meta.dirname, "..");
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "stack-down-fixture-"));
    const repoRoot = path.join(fixtureRoot, "repo");
    const realRepoRoot = realpathSync(path.dirname(repoRoot));
    const scriptsDir = path.join(repoRoot, "scripts");
    mkdirSync(scriptsDir, { recursive: true });

    copyFileSync(
      path.join(workspaceRoot, "scripts", "stack-down.sh"),
      path.join(scriptsDir, "stack-down.sh"),
    );
    chmodSync(path.join(scriptsDir, "stack-down.sh"), 0o755);

    const stackId = deriveStackId(repoRoot);
    const storageRoot = path.join(realRepoRoot, "repo", ".observability", stackId);
    mkdirSync(path.join(storageRoot, "victoria-traces", "partitions"), {
      recursive: true,
    });
    writeFileSync(path.join(storageRoot, "env"), "export STACK_ID=test\n");

    const output = execFileSync("bash", ["scripts/stack-down.sh"], {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
    });

    expect(output).toContain("stack down complete");
    expect(existsSync(storageRoot)).toBe(false);
  });
});
