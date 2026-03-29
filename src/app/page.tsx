import { TddCycleDemo } from "./components/tdd-cycle-demo";

export default function Home() {
  return (
    <div className="flex flex-1 bg-zinc-50 font-sans text-zinc-950">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-16 sm:px-10 lg:px-12">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
            Harness Legibility Demo
          </p>
          <div className="mt-6 max-w-3xl space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Vitest is ready, with colocated tests for red-green-refactor work.
            </h1>
            <p className="text-lg leading-8 text-zinc-600">
              Tests now live beside the files they protect, so future features
              can grow with small TDD loops instead of a separate test tree.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-sm text-zinc-500">Run once</p>
              <code className="mt-1 block text-sm font-medium text-zinc-950">
                npm run test
              </code>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-sm text-zinc-500">Stay in the loop</p>
              <code className="mt-1 block text-sm font-medium text-zinc-950">
                npm run test:watch
              </code>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
              Colocated Example
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">
              One feature folder, one implementation file, one nearby test.
            </h2>
            <div className="mt-4 space-y-4 text-base leading-7 text-zinc-600">
              <p>
                The demo component lives in{" "}
                <code>src/app/components/tdd-cycle-demo.tsx</code>, and its test
                sits right beside it as <code>tdd-cycle-demo.test.tsx</code>.
              </p>
              <p>
                That keeps each TDD cycle local: write a failing test, make it
                pass, then refactor with confidence.
              </p>
            </div>
          </div>

          <TddCycleDemo />
        </section>
      </main>
    </div>
  );
}
