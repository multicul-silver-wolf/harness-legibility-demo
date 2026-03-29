"use client";

import { useState } from "react";

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

export function TddCycleDemo() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = phases[phaseIndex];

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
          onClick={() => setPhaseIndex(getNextPhaseIndex(phaseIndex))}
          type="button"
        >
          Advance cycle
        </button>
        <button
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          onClick={() => setPhaseIndex(0)}
          type="button"
        >
          Reset to red
        </button>
      </div>
    </section>
  );
}
