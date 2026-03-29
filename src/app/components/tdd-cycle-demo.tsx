"use client";

import { useEffect, useRef, useState } from "react";

import {
  CANONICAL_JOURNEYS,
  getJourneyDurationMs,
  JOURNEY_TELEMETRY_ENDPOINT,
  type CanonicalJourney,
} from "@/lib/observability/journeys";

const phases = [
  {
    name: "Red",
    description:
      "Write a failing test that captures the next behavior you want.",
  },
  {
    name: "Green",
    description: "Implement the smallest change that makes the test pass.",
  },
  {
    name: "Refactor",
    description:
      "Clean up the code while the tests keep the behavior locked in.",
  },
] as const;

function getNextPhaseIndex(currentIndex: number) {
  return (currentIndex + 1) % phases.length;
}

async function sendJourneyTelemetry(input: {
  journey: CanonicalJourney;
  route: string;
  step: string;
}) {
  await fetch(JOURNEY_TELEMETRY_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      journey: input.journey,
      route: input.route,
      step: input.step,
      durationMs: getJourneyDurationMs(input.journey),
    }),
  });
}

export function TddCycleDemo() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const hasTrackedInitialLoad = useRef(false);
  const phase = phases[phaseIndex];

  useEffect(() => {
    if (hasTrackedInitialLoad.current) {
      return;
    }

    hasTrackedInitialLoad.current = true;

    void sendJourneyTelemetry({
      journey: CANONICAL_JOURNEYS[0],
      route: "/",
      step: "page-load",
    }).catch(() => undefined);
  }, []);

  function advanceCycle() {
    void sendJourneyTelemetry({
      journey: CANONICAL_JOURNEYS[1],
      route: "/",
      step: "advance-cycle",
    }).catch(() => undefined);

    setPhaseIndex((currentIndex) => getNextPhaseIndex(currentIndex));
  }

  function resetToRed() {
    void sendJourneyTelemetry({
      journey: CANONICAL_JOURNEYS[2],
      route: "/",
      step: "reset-to-red",
    }).catch(() => undefined);

    setPhaseIndex(0);
  }

  function submitAction() {
    void sendJourneyTelemetry({
      journey: CANONICAL_JOURNEYS[3],
      route: "/",
      step: "submit-action",
    }).catch(() => undefined);
  }

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
        Interactive Demo
      </p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Current phase</p>
          <h2 className="mt-2 text-3xl font-semibold text-zinc-950">
            {phase.name}
          </h2>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700">
          {phaseIndex + 1} / {phases.length}
        </span>
      </div>

      <p className="mt-4 max-w-md text-base leading-7 text-zinc-600">
        {phase.description}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          onClick={advanceCycle}
          type="button"
        >
          Advance cycle
        </button>
        <button
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          onClick={resetToRed}
          type="button"
        >
          Reset to red
        </button>
        <button
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          onClick={submitAction}
          type="button"
        >
          Submit action
        </button>
      </div>
    </section>
  );
}
