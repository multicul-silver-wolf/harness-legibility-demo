export const CANONICAL_JOURNEYS = [
  "home.initial_load",
  "demo.component_interaction",
  "diagnostics.view",
  "action.submit",
] as const;

export type CanonicalJourney = (typeof CANONICAL_JOURNEYS)[number];

export const JOURNEY_TELEMETRY_ENDPOINT = "/api/observability/journey";

const DEFAULT_JOURNEY_DURATIONS_MS: Record<CanonicalJourney, number> = {
  "home.initial_load": 320,
  "demo.component_interaction": 180,
  "diagnostics.view": 360,
  "action.submit": 480,
};

export type JourneyTelemetryInput = {
  journey: CanonicalJourney;
  route: string;
  step?: string;
  durationMs?: number;
};

export type JourneyTelemetryResponse = {
  requestId: string;
  durationMs: number;
  statusCode: number;
  failed: boolean;
};

export function isCanonicalJourney(value: string): value is CanonicalJourney {
  return (CANONICAL_JOURNEYS as readonly string[]).includes(value);
}

export function normalizeJourneyDurationMs(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.round(value));
}

export function getJourneyDurationMs(
  journey: CanonicalJourney,
  value?: number,
) {
  return normalizeJourneyDurationMs(value) ?? DEFAULT_JOURNEY_DURATIONS_MS[journey];
}
