import Link from "next/link";

const sourceRows = [
  { name: "LiveBench", status: "reasoning + coding", score: "0.94" },
  { name: "SWE-bench", status: "software fixes", score: "67.2" },
  { name: "BFCL", status: "tool calling", score: "77.5" },
  { name: "Aider", status: "code editing", score: "88.0" },
];

const rankingRows = [
  { model: "Claude Sonnet 4.6", detail: "1M context", score: "92" },
  { model: "GPT-5.4", detail: "frontier reasoning", score: "89" },
  { model: "Gemini 3 Pro", detail: "large context", score: "86" },
];

const workflowPanels = [
  {
    title: "Built from evidence",
    copy: "Benchmarks are normalized by task dimension, then weighted by how relevant each source is to the job.",
  },
  {
    title: "Compare without the wall",
    copy: "Pick models from a compact searchable list, keep selected models visible, and run comparisons from a fixed action bar.",
  },
  {
    title: "No email required",
    copy: "Create an account with only a username and password, then keep every model search tied to your own history.",
  },
];

const mockRuns = [
  {
    title: "Legal reasoning summary",
    rows: ["task weights parsed", "7 sources blended", "top 10 ranked"],
  },
  {
    title: "Coding agent comparison",
    rows: ["SWE-bench added", "Aider added", "side-by-side ready"],
  },
];

export function SplashScreen() {
  return (
    <section className="space-y-10 pb-10">
      <div className="relative overflow-hidden border border-border bg-surface">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(229,255,71,0.12) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-10 text-center sm:px-8 sm:py-14">
          <p className="font-mono text-sm uppercase tracking-[0.18em] text-accent">
            which-model
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl font-mono text-4xl font-semibold leading-tight text-primary sm:text-6xl">
            Pick the model that actually fits the work.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-secondary sm:text-lg">
            Describe the task, blend public benchmark evidence, and get a
            recommendation that explains why a model belongs on the shortlist.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-11 items-center justify-center border border-accent bg-accent px-5 py-2 font-mono text-sm font-medium text-black transition hover:bg-primary"
              href="/auth/signup"
            >
              Sign up
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center border border-border bg-bg px-5 py-2 font-mono text-sm font-medium text-primary transition hover:border-secondary"
              href="/auth/signin"
            >
              Sign in
            </Link>
          </div>

          <div
            aria-label="which-model recommendation workflow preview"
            className="mx-auto mt-10 max-w-5xl border border-border bg-bg text-left shadow-2xl shadow-black/30"
            role="img"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-secondary">
                  Model evidence run
                </p>
                <p className="mt-1 text-sm text-primary">
                  Pick a model for a production coding agent with tool calls.
                </p>
              </div>
              <span className="border border-success px-2 py-1 font-mono text-xs text-success">
                passed
              </span>
            </div>
            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
                <div className="grid gap-2 sm:grid-cols-2">
                  {sourceRows.map((source) => (
                    <div className="border border-border bg-surface p-3" key={source.name}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-sm text-primary">
                          {source.name}
                        </p>
                        <span className="font-mono text-xs text-accent">
                          {source.score}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-secondary">{source.status}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1" aria-hidden="true">
                  {[68, 44, 91, 57, 82, 73, 96].map((height, index) => (
                    <span
                      className="block border border-border bg-bg"
                      key={`${height}-${index}`}
                      style={{ height: `${height}px` }}
                    >
                      <span className="block h-full bg-accent/80" />
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-secondary">
                  Ranked shortlist
                </p>
                <div className="mt-3 space-y-2">
                  {rankingRows.map((row, index) => (
                    <div
                      className="grid grid-cols-[2rem_1fr_3rem] items-center gap-3 border border-border bg-surface px-3 py-2"
                      key={row.model}
                    >
                      <span className="font-mono text-xs text-secondary">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm text-primary">
                          {row.model}
                        </p>
                        <p className="text-xs text-secondary">{row.detail}</p>
                      </div>
                      <span className="text-right font-mono text-sm text-accent">
                        {row.score}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border border-border bg-black p-3 font-mono text-xs leading-6 text-secondary">
                  <p className="text-primary">analysis.complete()</p>
                  <p>weights: coding 1.00, tools 0.74, cost 0.31</p>
                  <p>evidence: 7 public benchmark sources blended</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {workflowPanels.map((panel) => (
          <div className="border border-border bg-surface p-5" key={panel.title}>
            <h2 className="font-mono text-base font-semibold text-primary">
              {panel.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-secondary">{panel.copy}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {mockRuns.map((run) => (
          <div className="border border-border bg-surface p-4" key={run.title}>
            <p className="font-mono text-xs uppercase text-secondary">
              Mock test run
            </p>
            <h2 className="mt-2 font-mono text-base font-semibold text-primary">
              {run.title}
            </h2>
            <div className="mt-4 space-y-2">
              {run.rows.map((row, index) => (
                <div
                  className="flex items-center justify-between gap-3 border border-border bg-bg px-3 py-2"
                  key={row}
                >
                  <span className="text-sm text-primary">{row}</span>
                  <span className="font-mono text-xs text-secondary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
