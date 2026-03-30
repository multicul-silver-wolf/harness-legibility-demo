#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_CONFIG = {
  paths: {
    instrumentation: "instrumentation.ts",
    journeys: "src/lib/observability/journeys.ts",
    logger: "src/lib/observability/logger.ts",
    metrics: "src/lib/observability/metrics.ts",
    tracing: "src/lib/observability/tracing.ts",
    runtime: "src/lib/observability/runtime.ts",
    stackContext: "src/lib/observability/stack-context.ts",
    stackBootstrap: "src/lib/observability/stack-bootstrap.ts",
    queryLogs: "src/lib/observability/query-logs.ts",
    queryMetrics: "src/lib/observability/query-metrics.ts",
    queryTraces: "src/lib/observability/query-traces.ts",
    metricsRoute: "src/app/api/metrics/route.ts",
    journeyRoute: "src/app/api/observability/journey/route.ts",
    stackUp: "scripts/stack-up.sh",
    stackDown: "scripts/stack-down.sh",
  },
  journeys: [
    "home.initial_load",
    "demo.component_interaction",
    "diagnostics.view",
    "action.submit",
  ],
  routes: {
    metrics: "/api/metrics",
    journey: "/api/observability/journey",
  },
  metrics: {
    startupDuration: "demo_app_startup_duration_ms",
    startupTotal: "demo_app_startup_total",
    journeyRuns: "demo_journey_runs_total",
  },
};

const FILE_RULES = {
  instrumentation: [/registerOTel/, /recordStartupSignal/, /NEXT_RUNTIME/],
  journeys: [/JOURNEY_TELEMETRY_ENDPOINT/, /isCanonicalJourney/],
  logger: [/OBSERVABILITY_LOGS_ENDPOINT|VictoriaLogs/],
  metrics: [/demo_app_startup_duration_ms/, /demo_journey_runs_total/],
  tracing: [/service\.name/, /stack_id/, /journey/],
  runtime: [/recordStartupSignal/, /recordJourneySignal/],
  stackContext: [/stackId|stack_id/, /worktreeId|worktree_id/],
  stackBootstrap: [/OTEL_EXPORTER_OTLP_TRACES_ENDPOINT/, /promscrape/],
  queryLogs: [/queryLogs/, /VictoriaLogs/],
  queryMetrics: [/queryMetrics/, /VictoriaMetrics/],
  queryTraces: [/queryTraces/, /VictoriaTraces|Jaeger/],
  metricsRoute: [/renderMetrics/, /text\/plain/],
  journeyRoute: [/recordJourneySignal/, /invalid_journey/],
  stackUp: [
    /victoria-logs/i,
    /victoria-metrics/i,
    /victoria-traces/i,
    /source .*env/,
  ],
  stackDown: [
    /victoria-logs\.pid/,
    /victoria-metrics\.pid/,
    /victoria-traces\.pid/,
  ],
};

function printUsage() {
  console.log(
    "Usage: node validate-harness.js --repo /absolute/path/to/repo [--layout path/to/layout.json] [--app-url http://127.0.0.1:3000]",
  );
}

function fail(message) {
  console.error(`ERROR ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    repo: "",
    layout: "",
    appUrl: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo") {
      args.repo = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--layout") {
      args.layout = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--app-url") {
      args.appUrl = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    fail(`unknown argument: ${arg}`);
  }

  if (!args.repo) {
    printUsage();
    fail("missing required --repo");
  }

  return args;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeConfig(base, override) {
  if (Array.isArray(base) && Array.isArray(override)) {
    return override;
  }

  if (isObject(base) && isObject(override)) {
    const merged = { ...base };
    for (const [key, value] of Object.entries(override)) {
      merged[key] = key in merged ? mergeConfig(merged[key], value) : value;
    }
    return merged;
  }

  return override;
}

function loadConfig(layoutPath) {
  if (!layoutPath) {
    return DEFAULT_CONFIG;
  }

  const raw = fs.readFileSync(layoutPath, "utf8");
  const parsed = JSON.parse(raw);
  return mergeConfig(DEFAULT_CONFIG, parsed);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function assertPackageJson(repoRoot, failures, passes) {
  const packageJsonPath = path.join(repoRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    failures.push("package.json is missing");
    return;
  }

  const packageJson = JSON.parse(readText(packageJsonPath));
  const nextVersion =
    packageJson.dependencies?.next ?? packageJson.devDependencies?.next;

  if (!nextVersion) {
    failures.push("package.json does not declare next");
    return;
  }

  passes.push(`package.json declares next (${nextVersion})`);
}

function assertFileRules(repoRoot, config, failures, passes) {
  for (const [key, relativePath] of Object.entries(config.paths)) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      failures.push(`missing required file: ${relativePath}`);
      continue;
    }

    const text = readText(absolutePath);
    const patterns = FILE_RULES[key] ?? [];
    const missingPatterns = patterns.filter((pattern) => !pattern.test(text));
    if (missingPatterns.length > 0) {
      failures.push(
        `${relativePath} is missing expected markers: ${missingPatterns
          .map((pattern) => pattern.toString())
          .join(", ")}`,
      );
      continue;
    }

    passes.push(`validated ${relativePath}`);
  }
}

function assertJourneys(repoRoot, config, failures, passes) {
  const journeysPath = path.join(repoRoot, config.paths.journeys);
  if (!fs.existsSync(journeysPath)) {
    return;
  }

  const text = readText(journeysPath);
  const missingJourneys = config.journeys.filter(
    (journey) => !text.includes(journey),
  );
  if (missingJourneys.length > 0) {
    failures.push(
      `${config.paths.journeys} is missing canonical journeys: ${missingJourneys.join(", ")}`,
    );
    return;
  }

  if (!text.includes(config.routes.journey)) {
    failures.push(
      `${config.paths.journeys} does not expose the configured journey route ${config.routes.journey}`,
    );
    return;
  }

  passes.push(`validated canonical journeys in ${config.paths.journeys}`);
}

async function assertRuntime(appUrl, config, failures, passes) {
  if (typeof fetch !== "function") {
    failures.push(
      "current Node runtime does not provide fetch for runtime validation",
    );
    return;
  }

  const metricsUrl = new URL(config.routes.metrics, appUrl).toString();
  const journeyUrl = new URL(config.routes.journey, appUrl).toString();

  const metricsResponse = await fetch(metricsUrl);
  const metricsText = await metricsResponse.text();
  if (!metricsResponse.ok) {
    failures.push(`${metricsUrl} returned ${metricsResponse.status}`);
    return;
  }

  const requiredMetricNames = [
    config.metrics.startupDuration,
    config.metrics.startupTotal,
  ];
  const missingInitialMetrics = requiredMetricNames.filter(
    (metricName) => !metricsText.includes(metricName),
  );
  if (missingInitialMetrics.length > 0) {
    failures.push(
      `${metricsUrl} is missing startup metrics: ${missingInitialMetrics.join(", ")}`,
    );
    return;
  }

  passes.push(`runtime metrics route responded at ${metricsUrl}`);

  const probeJourney = config.journeys[0];
  const journeyResponse = await fetch(journeyUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      journey: probeJourney,
      route: "/",
      step: "skill-validator",
      durationMs: 123,
    }),
  });

  if (![200, 202].includes(journeyResponse.status)) {
    failures.push(
      `${journeyUrl} returned unexpected status ${journeyResponse.status}`,
    );
    return;
  }

  passes.push(`runtime journey route responded at ${journeyUrl}`);

  const afterJourneyMetrics = await fetch(metricsUrl);
  const afterJourneyText = await afterJourneyMetrics.text();
  if (!afterJourneyMetrics.ok) {
    failures.push(
      `${metricsUrl} failed after journey replay with ${afterJourneyMetrics.status}`,
    );
    return;
  }

  if (
    !afterJourneyText.includes(config.metrics.journeyRuns) ||
    !afterJourneyText.includes(`journey="${probeJourney}"`)
  ) {
    failures.push(
      `${metricsUrl} did not show ${config.metrics.journeyRuns} for journey ${probeJourney}`,
    );
    return;
  }

  passes.push(`runtime journey metrics recorded for ${probeJourney}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(args.repo);
  if (!fs.existsSync(repoRoot) || !fs.statSync(repoRoot).isDirectory()) {
    fail(`repo path is not a directory: ${repoRoot}`);
  }

  const config = loadConfig(args.layout ? path.resolve(args.layout) : "");
  const failures = [];
  const passes = [];

  assertPackageJson(repoRoot, failures, passes);
  assertFileRules(repoRoot, config, failures, passes);
  assertJourneys(repoRoot, config, failures, passes);

  if (args.appUrl) {
    try {
      await assertRuntime(args.appUrl, config, failures, passes);
    } catch (error) {
      failures.push(`runtime validation failed: ${error.message}`);
    }
  } else {
    passes.push(
      "runtime validation skipped because --app-url was not provided",
    );
  }

  for (const message of passes) {
    console.log(`PASS ${message}`);
  }

  if (failures.length > 0) {
    for (const message of failures) {
      console.error(`FAIL ${message}`);
    }
    process.exit(1);
  }

  console.log("Validation succeeded.");
}

main().catch((error) => {
  fail(error.message);
});
