import Link from "next/link";

const featureRows = [
  {
    title: "Evidence first",
    copy: "Evaluate public benchmark signals and see what shaped the answer.",
  },
  {
    title: "Task aware",
    copy: "Tune recommendations by context length, cost, latency, and model tier.",
  },
  {
    title: "Easy to compare",
    copy: "Move from a ranked shortlist into a side-by-side comparison flow.",
  },
];

const previewSources = [
  { name: "LiveBench", score: "0.94", width: "88%" },
  { name: "SWE-bench", score: "67.2", width: "62%" },
  { name: "BFCL", score: "77.5", width: "74%" },
];

function FeatureIcon({ index }: { index: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] border border-accent/45 bg-accent/10 text-accent"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20">
        <path
          d={
            index === 0
              ? "M10 3.5 15.5 6.7v6.6L10 16.5l-5.5-3.2V6.7L10 3.5Z"
              : index === 1
                ? "M4.5 10h11M10 4.5v11M6.2 6.2l7.6 7.6M13.8 6.2l-7.6 7.6"
                : "M5 6h10M5 10h10M5 14h6"
          }
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    </span>
  );
}

export function SplashScreen() {
  return (
    <section className="relative overflow-hidden rounded-[8px] border border-border bg-surface shadow-[var(--shadow-soft)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(92,225,216,0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(246,248,251,0.04) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage:
            "linear-gradient(120deg, black 0%, black 52%, transparent 84%)",
        }}
      />
      <div className="relative grid min-h-[calc(100vh-8rem)] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:px-12 lg:py-12">
        <div className="flex flex-col justify-center">
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.04] text-primary sm:text-6xl">
            Choose the right LLM for your task.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-secondary">
            which-model analyzes benchmark evidence to recommend and compare
            LLMs that fit your needs: fast, objective, and transparent.
          </p>

          <div className="mt-8 space-y-5">
            {featureRows.map((row, index) => (
              <div className="flex gap-4" key={row.title}>
                <FeatureIcon index={index} />
                <div>
                  <h2 className="text-sm font-semibold text-primary">
                    {row.title}
                  </h2>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-secondary">
                    {row.copy}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm text-muted">
            No email required. Built for engineers, AI builders, and product
            teams.
          </p>
        </div>

        <div className="flex items-center">
          <div className="w-full rounded-[8px] border border-border-strong bg-raised p-4 shadow-[var(--shadow-soft)] sm:p-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-primary">
                      Try it now
                    </h2>
                    <p className="mt-1 text-sm text-secondary">
                      Describe your task to get personalized recommendations.
                    </p>
                  </div>
                  <Link
                    className="hidden rounded-[6px] border border-border px-3 py-2 text-sm text-secondary transition hover:border-secondary hover:text-primary sm:inline-flex"
                    href="/auth/signin"
                  >
                    Sign in
                  </Link>
                </div>

                <div className="mt-4 rounded-[6px] border border-border bg-soft p-4">
                  <p className="min-h-28 text-sm leading-6 text-muted">
                    Describe what you need an LLM to do...
                  </p>
                  <p className="mt-2 text-right font-mono text-[11px] text-muted">
                    0/500
                  </p>
                </div>

                <div className="mt-4">
                  <p className="font-mono text-xs uppercase text-secondary">
                    Preferences
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      "Cost conscious",
                      "Prefer frontier models",
                      "Need long context",
                      "Low latency",
                      "Local-only",
                    ].map((label, index) => (
                      <label
                        className="flex min-h-9 items-center gap-2 rounded-[6px] border border-border bg-soft px-2.5 py-2 text-xs leading-4 text-secondary"
                        key={label}
                      >
                        <input
                          checked={index === 2}
                          className="h-3.5 w-3.5 accent-accent"
                          readOnly
                          type="checkbox"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Link
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[6px] border border-accent bg-accent px-5 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(200,255,38,0.12)] transition hover:bg-primary"
                  href="/auth/signup"
                >
                  Find Best Models
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
                    <path
                      d="M4 10h11M11 6l4 4-4 4"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.7"
                    />
                  </svg>
                </Link>
              </div>

              <div className="rounded-[8px] border border-border bg-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-primary">
                    Evidence preview
                  </p>
                  <span className="font-mono text-[11px] uppercase text-muted">
                    sample
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {previewSources.map((source) => (
                    <div key={source.name}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="text-secondary">{source.name}</span>
                        <span className="font-mono text-cyan">{source.score}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-border">
                        <span
                          className="block h-full rounded-full bg-cyan"
                          style={{ width: source.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-[6px] border border-border bg-surface p-3">
                  <p className="font-mono text-[11px] uppercase text-muted">
                    Ranked shortlist
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    {["GPT-4o", "Claude 3.5 Sonnet", "Gemini 1.5 Pro"].map(
                      (model, index) => (
                        <div
                          className="grid grid-cols-[1.5rem_1fr_2.5rem] items-center gap-2 rounded-[5px] border border-border bg-soft px-2 py-2"
                          key={model}
                        >
                          <span className="font-mono text-xs text-muted">
                            #{index + 1}
                          </span>
                          <span className="truncate text-primary">{model}</span>
                          <span className="text-right font-mono text-cyan">
                            {92 - index * 3}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted">
              <span>Scoring combines task weights with curated evidence.</span>
              <div className="flex gap-4">
                <span>Benchmarks</span>
                <span>Compare</span>
                <span>Privacy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
