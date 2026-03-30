#!/usr/bin/env node

const { execFileSync, spawn } = require("node:child_process");
const { existsSync, readdirSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const verbose = args.has("--verbose");
const keepRunning = args.has("--keep-running");

const pagePath = path.join(repoRoot, "src", "app", "page.tsx");
const regressionSourceText = "instead of a separate test tree.";
const regressionTargetText = "instead of a split test tree.";

const canonicalJourneys = [
  {
    journey: "home.initial_load",
    route: "/",
    step: "page-load",
    durationMs: 320,
  },
  {
    journey: "demo.component_interaction",
    route: "/",
    step: "advance-cycle",
    durationMs: 180,
  },
  {
    journey: "diagnostics.view",
    route: "/",
    step: "reset-to-red",
    durationMs: 360,
  },
  {
    journey: "action.submit",
    route: "/",
    step: "submit-action",
    durationMs: 480,
  },
];

let stackEnv = null;
let appProcess = null;
let pageContentBackup = null;
let needsRestoreBuild = false;

function computeStackId(cwd) {
  const normalized = path.resolve(cwd).replace(/\\/g, "/");
  let hash = 0x811c9dc5;

  for (const char of normalized) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  const stackIdSalt = 0x4ab61fa5;
  return `hld-${((hash ^ stackIdSalt) >>> 0).toString(16).padStart(8, "0")}`;
}

const stackStorageRoot = path.join(repoRoot, ".observability", computeStackId(repoRoot));

function info(message) {
  process.stdout.write(`${message}\n`);
}

function debug(message) {
  if (verbose) {
    info(message);
  }
}

function quoteForLog(value) {
  return JSON.stringify(value);
}

function parseEnvFile(contents) {
  const env = {};

  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const normalized = line.startsWith("export ") ? line.slice(7) : line;
    const equalsIndex = normalized.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = normalized.slice(0, equalsIndex).trim();
    const value = normalized.slice(equalsIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

function deriveBinaryEnv() {
  const env = { ...process.env };
  const candidates = [
    ["VICTORIA_LOGS_BIN", "/opt/homebrew/bin/victoria-logs"],
    ["VICTORIA_METRICS_BIN", "/opt/homebrew/bin/victoria-metrics"],
    [
      "VICTORIA_TRACES_BIN",
      path.join(repoRoot, ".observability", "bin", "victoria-traces-prod"),
    ],
  ];

  for (const [key, candidate] of candidates) {
    if (!env[key] && existsSync(candidate)) {
      env[key] = candidate;
    }
  }

  return env;
}

function execCommand(command, commandArgs, options = {}) {
  debug(
    `> ${command} ${commandArgs.map((arg) => quoteForLog(arg)).join(" ")}`.trim(),
  );

  return execFileSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(label, fn, timeoutMs, intervalMs = 250) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await fn();
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(intervalMs);
  }

  if (lastError) {
    throw new Error(`${label} timed out: ${lastError.message}`);
  }

  throw new Error(`${label} timed out`);
}

async function fetchText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${url} -> ${response.status}: ${text}`);
  }

  return text;
}

async function fetchJson(url, init) {
  const text = await fetchText(url, {
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  return JSON.parse(text);
}

function readGauge(metricsText, metricName, labels) {
  for (const line of metricsText.split("\n")) {
    if (!line.startsWith(`${metricName}{`)) {
      continue;
    }

    let hasAllLabels = true;
    for (const [key, value] of Object.entries(labels)) {
      if (!line.includes(`${key}="${value}"`)) {
        hasAllLabels = false;
        break;
      }
    }

    if (!hasAllLabels) {
      continue;
    }

    const parts = line.trim().split(/\s+/);
    return Number(parts.at(-1));
  }

  return null;
}

async function queryPromql(query) {
  const url = new URL("http://127.0.0.1:18428/api/v1/query");
  url.searchParams.set("query", query);
  return fetchJson(url.toString());
}

async function waitForScrapeUp(timeoutMs = 60000) {
  return waitFor(
    "VictoriaMetrics scrape status",
    async () => {
      const payload = await queryPromql(
        `up{job="nextjs-app",service="${stackEnv.OTEL_SERVICE_NAME}",stack_id="${stackEnv.STACK_ID}"}`,
      );
      const value = payload?.data?.result?.[0]?.value?.[1];
      return value !== undefined && Number(value) === 1 ? 1 : null;
    },
    timeoutMs,
    1000,
  );
}

async function queryLogs(filters = {}) {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const end = now.toISOString();

  const clauses = [
    `_time:30m`,
    `stack_id:"${stackEnv.STACK_ID}"`,
    `service:"${stackEnv.OTEL_SERVICE_NAME}"`,
  ];

  if (filters.level) {
    clauses.push(`level:"${filters.level}"`);
  }

  if (filters.journey) {
    clauses.push(`journey:"${filters.journey}"`);
  }

  if (filters.eventType) {
    clauses.push(`event_type:"${filters.eventType}"`);
  }

  const url = new URL("http://127.0.0.1:10528/select/logsql/query");
  url.searchParams.set("query", clauses.join(" AND "));
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  url.searchParams.set("limit", String(filters.limit ?? 200));

  const text = await fetchText(url.toString());

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function queryTraces({ journey, limit = 100 } = {}) {
  const url = new URL("http://127.0.0.1:11428/select/jaeger/api/traces");
  url.searchParams.set("service", stackEnv.OTEL_SERVICE_NAME);
  url.searchParams.set("limit", String(limit));

  if (journey) {
    url.searchParams.set(
      "tags",
      JSON.stringify({
        stack_id: stackEnv.STACK_ID,
        journey,
      }),
    );
  }

  return fetchJson(url.toString());
}

function tagsToObject(tags) {
  return Object.fromEntries(
    (Array.isArray(tags) ? tags : []).map((tag) => [tag.key, String(tag.value)]),
  );
}

function pickLatestJourneySpans(tracePayload) {
  const latestByJourney = new Map();

  for (const trace of tracePayload.data ?? []) {
    for (const span of trace.spans ?? []) {
      const tags = tagsToObject(span.tags);
      const journey = tags.journey;

      if (!journey || tags.stack_id !== stackEnv.STACK_ID) {
        continue;
      }

      const current = latestByJourney.get(journey);
      if (!current || Number(span.startTime) > Number(current.startTime)) {
        latestByJourney.set(journey, {
          traceId: trace.traceID,
          name: span.operationName,
          durationMs: Number(span.duration) / 1000,
          startTime: Number(span.startTime),
          tags,
        });
      }
    }
  }

  return latestByJourney;
}

function pickLatestJourneyLogs(logRows) {
  const latestByJourney = new Map();

  for (const row of logRows) {
    if (!row.journey || row.stack_id !== stackEnv.STACK_ID) {
      continue;
    }

    const current = latestByJourney.get(row.journey);
    if (!current || row._time > current._time) {
      latestByJourney.set(row.journey, row);
    }
  }

  return latestByJourney;
}

function readStackProcessLogs() {
  const processLogsDir = path.join(stackStorageRoot, "process-logs");

  if (!existsSync(processLogsDir)) {
    return "no stack process logs found";
  }

  const logFiles = readdirSync(processLogsDir)
    .filter((name) => name.endsWith(".log"))
    .sort();

  if (logFiles.length === 0) {
    return `no log files found under ${processLogsDir}`;
  }

  return logFiles
    .map((name) => {
      const filePath = path.join(processLogsDir, name);
      const contents = readFileSync(filePath, "utf8").trim();
      const excerpt = contents
        ? contents.split("\n").slice(-40).join("\n")
        : "(empty log)";
      return `== ${filePath} ==\n${excerpt}`;
    })
    .join("\n\n");
}

async function ensureStackStopped() {
  try {
    stopStack();
  } catch (error) {
    debug(`stack-down preflight failed: ${error.message}`);
  }
}

async function startStack() {
  await ensureStackStopped();

  let output;

  try {
    output = execCommand("bash", ["scripts/stack-up.sh"], {
      env: deriveBinaryEnv(),
    });
  } catch (error) {
    const processLogs = readStackProcessLogs();
    throw new Error(`${error.message}\nstack process logs:\n${processLogs}`);
  }

  const match = output.match(/source (.+)$/m);

  if (!match) {
    throw new Error(`Unable to locate generated env file from stack-up output:\n${output}`);
  }

  const envFile = match[1].trim();
  stackEnv = parseEnvFile(readFileSync(envFile, "utf8"));
  stackEnv.__ENV_FILE__ = envFile;
  debug(`stack env file: ${envFile}`);
}

function mergedAppEnv() {
  return {
    ...process.env,
    ...stackEnv,
  };
}

async function buildApp() {
  execCommand("npm", ["run", "build"]);
}

async function startApp() {
  if (appProcess) {
    throw new Error("App process is already running");
  }

  const child = spawn(
    "npm",
    ["run", "start", "--", "--hostname", "127.0.0.1", "--port", "3000"],
    {
      cwd: repoRoot,
      env: mergedAppEnv(),
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    if (verbose) {
      process.stdout.write(chunk);
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    if (verbose) {
      process.stderr.write(chunk);
    }
  });
  child.on("exit", (code) => {
    if (code !== null && code !== 0 && verbose) {
      info(`app exited with code ${code}`);
    }
  });

  appProcess = {
    child,
    getLogs() {
      return { stdout, stderr };
    },
  };

  try {
    await waitFor(
      "app /api/metrics readiness",
      async () => {
        const text = await fetchText("http://127.0.0.1:3000/api/metrics");
        return text.includes("demo_app_startup_duration_ms") ? true : false;
      },
      30000,
    );
  } catch (error) {
    const logs = appProcess.getLogs();
    throw new Error(
      `${error.message}\nstdout:\n${logs.stdout}\nstderr:\n${logs.stderr}`,
    );
  }
}

async function stopApp() {
  if (!appProcess) {
    return;
  }

  const pid = appProcess.child.pid;

  try {
    process.kill(-pid, "SIGINT");
  } catch {
    try {
      appProcess.child.kill("SIGINT");
    } catch {}
  }

  await waitFor(
    "app shutdown",
    async () => appProcess.child.exitCode !== null,
    10000,
    100,
  ).catch(async () => {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        appProcess.child.kill("SIGKILL");
      } catch {}
    }
  });

  appProcess = null;
}

async function stopStack() {
  execCommand("bash", ["scripts/stack-down.sh"]);
}

async function fetchHomePage() {
  return fetchText("http://127.0.0.1:3000/");
}

async function postJourney(definition) {
  const response = await fetch("http://127.0.0.1:3000/api/observability/journey", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(definition),
  });

  const body = await response.json();

  return {
    status: response.status,
    body,
  };
}

async function replayCanonicalJourneys() {
  const results = [];

  for (const definition of canonicalJourneys) {
    results.push(await postJourney(definition));
  }

  return results;
}

async function collectStartupEvidence() {
  const labels = {
    service: stackEnv.OTEL_SERVICE_NAME,
    stack_id: stackEnv.STACK_ID,
  };

  const appMetric = await waitFor(
    "startup metric on app",
    async () => {
      const text = await fetchText("http://127.0.0.1:3000/api/metrics");
      const durationMs = readGauge(text, "demo_app_startup_duration_ms", labels);
      const total = readGauge(text, "demo_app_startup_total", labels);
      const failures = readGauge(
        text,
        "demo_app_startup_failures_total",
        labels,
      );
      if (durationMs === null) {
        return null;
      }
      return { durationMs, total, failures };
    },
    30000,
  );

  const scrapeStatus = await waitForScrapeUp();

  const victoriaMetric = await waitFor(
    "startup metric in VictoriaMetrics",
    async () => {
      const payload = await queryPromql(
        `demo_app_startup_duration_ms{service="${stackEnv.OTEL_SERVICE_NAME}",stack_id="${stackEnv.STACK_ID}"}`,
      );
      const value = payload?.data?.result?.[0]?.value?.[1];
      return value !== undefined ? Number(value) : null;
    },
    30000,
  );

  const startupTrace = await waitFor(
    "startup trace in VictoriaTraces",
    async () => {
      const traces = await queryTraces();
      for (const trace of traces.data ?? []) {
        for (const span of trace.spans ?? []) {
          if (span.operationName !== "app.startup") {
            continue;
          }

          const tags = tagsToObject(span.tags);
          if (tags.stack_id !== stackEnv.STACK_ID) {
            continue;
          }

          return {
            traceId: trace.traceID,
            durationMs: Number(span.duration) / 1000,
            tags,
          };
        }
      }

      return null;
    },
    30000,
  );

  const startupLogs = await queryLogs({
    eventType: "app.startup",
    limit: 20,
  });

  const latestStartupLog = startupLogs
    .filter((row) => row.stack_id === stackEnv.STACK_ID)
    .sort((left, right) => String(right._time).localeCompare(String(left._time)))[0];

  return {
    appMetric,
    scrapeStatus,
    victoriaMetric,
    startupTrace,
    startupLog: latestStartupLog,
  };
}

async function collectJourneyEvidence() {
  const replayResponses = await replayCanonicalJourneys();

  const journeySpans = await waitFor(
    "journey spans in VictoriaTraces",
    async () => {
      const latestByJourney = new Map();

      for (const definition of canonicalJourneys) {
        const traces = await queryTraces({
          journey: definition.journey,
          limit: 20,
        });
        const latest = pickLatestJourneySpans(traces).get(definition.journey);

        if (!latest) {
          return null;
        }

        latestByJourney.set(definition.journey, latest);
      }

      return latestByJourney;
    },
    60000,
    1000,
  );

  const journeyLogs = await waitFor(
    "journey logs in VictoriaLogs",
    async () => {
      const rows = await queryLogs({ limit: 200 });
      const latestByJourney = pickLatestJourneyLogs(rows);
      return latestByJourney.size === canonicalJourneys.length ? latestByJourney : null;
    },
    60000,
    1000,
  );

  const journeyMetrics = await waitFor(
    "journey totals in VictoriaMetrics",
    async () => {
      const totals = new Map();
      for (const definition of canonicalJourneys) {
        const payload = await queryPromql(
          `demo_journey_runs_total{service="${stackEnv.OTEL_SERVICE_NAME}",stack_id="${stackEnv.STACK_ID}",journey="${definition.journey}"}`,
        );
        const value = payload?.data?.result?.[0]?.value?.[1];
        if (value === undefined) {
          return null;
        }
        totals.set(definition.journey, Number(value));
      }
      return totals;
    },
    60000,
    1000,
  );

  const scrapeStatus = await waitForScrapeUp();

  const journeyRunsTotal = await queryPromql(
    `sum(demo_journey_runs_total{service="${stackEnv.OTEL_SERVICE_NAME}",stack_id="${stackEnv.STACK_ID}"})`,
  );
  const httpErrors = await queryPromql(
    `sum(demo_http_request_errors_total{service="${stackEnv.OTEL_SERVICE_NAME}",stack_id="${stackEnv.STACK_ID}"})`,
  );

  return {
    replayResponses,
    journeySpans,
    journeyLogs,
    journeyMetrics,
    scrapeStatus,
    aggregatedJourneyRuns:
      Number(journeyRunsTotal?.data?.result?.[0]?.value?.[1] ?? 0),
    aggregatedHttpErrors: Number(httpErrors?.data?.result?.[0]?.value?.[1] ?? 0),
  };
}

async function runRegressionEvidence() {
  pageContentBackup = readFileSync(pagePath, "utf8");
  if (!pageContentBackup.includes(regressionSourceText)) {
    throw new Error(
      `Regression source text not found in ${pagePath}: ${regressionSourceText}`,
    );
  }

  writeFileSync(
    pagePath,
    pageContentBackup.replace(regressionSourceText, regressionTargetText),
  );
  needsRestoreBuild = true;

  await stopApp();
  await buildApp();
  await startApp();

  const homePage = await fetchHomePage();
  if (!homePage.includes(regressionTargetText)) {
    throw new Error("Temporary regression change did not appear in rendered home page");
  }

  const startup = await collectStartupEvidence();
  const journeys = await collectJourneyEvidence();

  await stopApp();
  writeFileSync(pagePath, pageContentBackup);
  pageContentBackup = null;
  await buildApp();
  needsRestoreBuild = false;

  if (keepRunning) {
    await startApp();
  }

  return {
    homePageContainsChangedText: true,
    startup,
    journeys,
  };
}

function formatResult(result) {
  const lines = [`[${result.pass ? "PASS" : "FAIL"}] ${result.title}`];
  for (const detail of result.details) {
    lines.push(`  - ${detail}`);
  }
  return lines.join("\n");
}

async function main() {
  const results = [];

  try {
    await startStack();
    await buildApp();
    await startApp();

    const startup = await collectStartupEvidence();
    const journeyEvidence = await collectJourneyEvidence();

    results.push({
      title:
        "Start the local observability stack for this worktree, boot the app, and verify that service startup completes in under 800ms.",
      pass:
        startup.appMetric.durationMs < 800 &&
        startup.victoriaMetric < 800 &&
        startup.startupTrace.durationMs < 800,
      details: [
        `app metric=${startup.appMetric.durationMs}ms`,
        `VictoriaMetrics=${startup.victoriaMetric}ms`,
        `startup trace=${startup.startupTrace.durationMs}ms traceId=${startup.startupTrace.traceId}`,
      ],
    });

    results.push({
      title:
        "Check whether the current startup signal is healthy. Tell me the latest startup duration, whether it is under 800ms, and which log and trace records support your conclusion.",
      pass:
        startup.appMetric.durationMs < 800 &&
        Boolean(startup.startupLog) &&
        Boolean(startup.startupTrace),
      details: [
        `latest startup duration=${startup.appMetric.durationMs}ms`,
        `startup log ts=${startup.startupLog?._time ?? "missing"} message=${startup.startupLog?._msg ?? "missing"}`,
        `startup trace=${startup.startupTrace.traceId}`,
      ],
    });

    const allUnder2s = canonicalJourneys.every((definition) => {
      const span = journeyEvidence.journeySpans.get(definition.journey);
      return span && span.durationMs < 2000;
    });

    results.push({
      title:
        "Open the demo page, trigger the canonical journeys, and verify that no span for home.initial_load, demo.component_interaction, diagnostics.view, or action.submit exceeds two seconds.",
      pass:
        allUnder2s &&
        journeyEvidence.replayResponses.every((response) => response.status === 200),
      details: canonicalJourneys.map((definition) => {
        const span = journeyEvidence.journeySpans.get(definition.journey);
        return `${definition.journey}=${span.durationMs}ms traceId=${span.traceId}`;
      }),
    });

    results.push({
      title:
        "Run the UI once and summarize the latest span durations for the four canonical journeys. If any journey is slower than expected, point to the exact trace evidence.",
      pass: canonicalJourneys.every((definition) =>
        journeyEvidence.journeySpans.has(definition.journey),
      ),
      details: canonicalJourneys.map((definition) => {
        const span = journeyEvidence.journeySpans.get(definition.journey);
        return `${definition.journey}: ${span.durationMs}ms via trace ${span.traceId}`;
      }),
    });

    const structuredJourneyLogs = canonicalJourneys.every((definition) => {
      const row = journeyEvidence.journeyLogs.get(definition.journey);
      return (
        row &&
        typeof row._msg === "string" &&
        typeof row.level === "string" &&
        typeof row.duration_ms === "string" &&
        typeof row.status_code === "string"
      );
    });

    results.push({
      title:
        "Exercise the demo interactions and inspect the latest logs for this worktree. Confirm that the journey logs are structured correctly and list the most recent event for each canonical journey.",
      pass: structuredJourneyLogs,
      details: canonicalJourneys.map((definition) => {
        const row = journeyEvidence.journeyLogs.get(definition.journey);
        return `${definition.journey}: ${row._msg} @ ${row._time}`;
      }),
    });

    const currentLogs = await queryLogs({ limit: 200 });
    const errorLogs = currentLogs.filter(
      (row) => row.stack_id === stackEnv.STACK_ID && row.level === "error",
    );
    const malformedJourneyLogs = currentLogs.filter(
      (row) =>
        row.stack_id === stackEnv.STACK_ID &&
        row.journey &&
        (!row._msg || !row.duration_ms || !row.status_code),
    );

    results.push({
      title:
        "Check the current logs for this stack and tell me whether there are any error-level events, missing message fields, or malformed journey records.",
      pass: errorLogs.length === 0 && malformedJourneyLogs.length === 0,
      details: [
        `error-level events=${errorLogs.length}`,
        `malformed journey records=${malformedJourneyLogs.length}`,
      ],
    });

    results.push({
      title:
        "Verify that VictoriaMetrics is scraping the Next.js metrics endpoint successfully, then report the latest demo_journey_runs_total values for each canonical journey in this worktree.",
      pass:
        journeyEvidence.scrapeStatus === 1 &&
        canonicalJourneys.every((definition) =>
          journeyEvidence.journeyMetrics.has(definition.journey),
        ),
      details: [
        `up{job="nextjs-app"}=${journeyEvidence.scrapeStatus}`,
        ...canonicalJourneys.map(
          (definition) =>
            `${definition.journey}=${journeyEvidence.journeyMetrics.get(definition.journey)}`,
        ),
      ],
    });

    results.push({
      title:
        "Use Prometheus-style queries against the local metrics backend to tell me how many journey runs have been observed so far, how many HTTP request errors occurred, and what the latest startup duration is.",
      pass:
        journeyEvidence.aggregatedJourneyRuns >= canonicalJourneys.length &&
        journeyEvidence.aggregatedHttpErrors === 0,
      details: [
        `journey runs=${journeyEvidence.aggregatedJourneyRuns}`,
        `http request errors=${journeyEvidence.aggregatedHttpErrors}`,
        `latest startup duration=${startup.victoriaMetric}ms`,
      ],
    });

    const regression = await runRegressionEvidence();
    const regressionJourneysHealthy = canonicalJourneys.every((definition) => {
      const span = regression.journeys.journeySpans.get(definition.journey);
      return span && span.durationMs < 2000;
    });

    results.push({
      title:
        "Make a small change to the demo, rerun the canonical journeys, and use logs, metrics, and traces to prove the harness still works end to end.",
      pass:
        regression.homePageContainsChangedText &&
        regression.journeys.replayResponses.every((response) => response.status === 200) &&
        regression.journeys.aggregatedHttpErrors === 0 &&
        regressionJourneysHealthy,
      details: [
        "temporary page copy change rendered successfully",
        `journey runs=${regression.journeys.aggregatedJourneyRuns}`,
        `http request errors=${regression.journeys.aggregatedHttpErrors}`,
        `startup after change=${regression.startup.appMetric.durationMs}ms`,
      ],
    });

    const hasJourneyLogsAfterChange = canonicalJourneys.every((definition) =>
      regression.journeys.journeyLogs.has(definition.journey),
    );
    const hasJourneyMetricsAfterChange = canonicalJourneys.every((definition) =>
      regression.journeys.journeyMetrics.has(definition.journey),
    );
    const hasJourneySpansAfterChange = canonicalJourneys.every((definition) =>
      regression.journeys.journeySpans.has(definition.journey),
    );

    results.push({
      title:
        "Treat this repo like an agent-validation harness. After your change, use the local observability stack to confirm that the app still emits startup telemetry, journey logs, journey metrics, and journey spans.",
      pass:
        regression.startup.appMetric.durationMs < 800 &&
        Boolean(regression.startup.startupLog) &&
        Boolean(regression.startup.startupTrace) &&
        hasJourneyLogsAfterChange &&
        hasJourneyMetricsAfterChange &&
        hasJourneySpansAfterChange,
      details: [
        `startup trace=${regression.startup.startupTrace.traceId}`,
        `journey logs=${regression.journeys.journeyLogs.size}`,
        `journey metrics=${regression.journeys.journeyMetrics.size}`,
        `journey spans=${regression.journeys.journeySpans.size}`,
      ],
    });
  } finally {
    if (pageContentBackup !== null) {
      writeFileSync(pagePath, pageContentBackup);
      pageContentBackup = null;
    }

    if (appProcess && !keepRunning) {
      await stopApp();
    }

    if (needsRestoreBuild) {
      await buildApp();
      needsRestoreBuild = false;
    }

    if (!keepRunning) {
      await stopStack();
    }
  }

  info("\nREADME Prompt Smoke Suite\n");
  for (const result of results) {
    info(formatResult(result));
  }

  const failed = results.filter((result) => !result.pass);
  info(
    `\nSummary: ${results.length - failed.length}/${results.length} prompts passed.`,
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`README smoke suite failed: ${error.message}\n`);
  process.exitCode = 1;
});
