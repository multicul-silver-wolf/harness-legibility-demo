import path from "node:path";

export type StackContextInput = {
  cwd: string;
  service: string;
  stackId?: string;
  worktreeId?: string;
};

export type StackContext = {
  stackId: string;
  worktreeId: string;
  service: string;
  storageRoot: string;
  endpoints: {
    logsIngestUrl: string;
    metricsBaseUrl: string;
    tracesBaseUrl: string;
  };
};

const LOGS_INGEST_URL =
  "http://127.0.0.1:10528/insert/jsonline?_stream_fields=service,stack_id,worktree_id,level,event_type";
const METRICS_BASE_URL = "http://127.0.0.1:18428";
const TRACES_BASE_URL = "http://127.0.0.1:11428";
const STACK_ID_SALT = 0x4ab61fa5;

function normalizePath(input: string) {
  return path.resolve(input).replace(/\\/g, "/");
}

function fnv1a32(input: string) {
  let hash = 0x811c9dc5;

  for (const char of input) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

function deriveStackId(cwd: string) {
  const normalized = normalizePath(cwd);
  const hash = (fnv1a32(normalized) ^ STACK_ID_SALT) >>> 0;
  return `hld-${hash.toString(16).padStart(8, "0")}`;
}

export function createStackContext(input: StackContextInput): StackContext {
  const normalizedCwd = normalizePath(input.cwd);
  const stackId = input.stackId ?? deriveStackId(normalizedCwd);
  const worktreeId = input.worktreeId ?? path.basename(normalizedCwd);

  return {
    stackId,
    worktreeId,
    service: input.service,
    storageRoot: path.join(normalizedCwd, ".observability", stackId),
    endpoints: {
      logsIngestUrl: LOGS_INGEST_URL,
      metricsBaseUrl: METRICS_BASE_URL,
      tracesBaseUrl: TRACES_BASE_URL,
    },
  };
}
