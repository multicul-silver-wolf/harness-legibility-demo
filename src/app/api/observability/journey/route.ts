import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  getJourneyDurationMs,
  isCanonicalJourney,
  normalizeJourneyDurationMs,
  type JourneyTelemetryInput,
  type JourneyTelemetryResponse,
} from "@/lib/observability/journeys";
import { recordJourneySignal } from "@/lib/observability/runtime";

export const runtime = "nodejs";

type JourneyRequestBody = {
  journey?: unknown;
  route?: unknown;
  step?: unknown;
  durationMs?: unknown;
};

function parseJourneyRequest(body: JourneyRequestBody): JourneyTelemetryInput | null {
  if (typeof body.journey !== "string" || !isCanonicalJourney(body.journey)) {
    return null;
  }

  if (typeof body.route !== "string" || body.route.trim() === "") {
    return null;
  }

  return {
    journey: body.journey,
    route: body.route,
    step: typeof body.step === "string" && body.step.trim() !== "" ? body.step : undefined,
    durationMs: getJourneyDurationMs(
      body.journey,
      normalizeJourneyDurationMs(
        typeof body.durationMs === "number" ? body.durationMs : undefined,
      ),
    ),
  };
}

export async function POST(request: Request) {
  let body: JourneyRequestBody;

  try {
    body = (await request.json()) as JourneyRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_journey" }, { status: 400 });
  }

  const input = parseJourneyRequest(body);

  if (!input) {
    return NextResponse.json({ error: "invalid_journey" }, { status: 400 });
  }

  try {
    const response = await recordJourneySignal({
      journey: input.journey,
      route: input.route,
      step: input.step,
      durationMs: input.durationMs,
    });

    return NextResponse.json(response, { status: response.statusCode });
  } catch {
    const fallback: JourneyTelemetryResponse = {
      requestId: randomUUID(),
      durationMs: input.durationMs ?? 0,
      statusCode: 202,
      failed: false,
    };

    return NextResponse.json(fallback, { status: 202 });
  }
}
