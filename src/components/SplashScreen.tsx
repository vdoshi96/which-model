import Link from "next/link";

const artifactRows = [
  { label: "Task", value: "Pick a model for a legal reasoning workflow" },
  { label: "Weights", value: "Reasoning 1.00 · instruction following 0.72" },
  { label: "Output", value: "Ranked shortlist with benchmark evidence" },
];

const mockRuns = [
  {
    title: "Legal reasoning summary",
    status: "Mock test run",
    rows: ["Claude 3.5 Sonnet", "GPT-4.1", "Gemini 1.5 Pro"],
  },
  {
    title: "Coding agent comparison",
    status: "Mock test run",
    rows: ["weighted score 0.91", "context 200,000", "cost $3.00 / $15.00"],
  },
];

export function SplashScreen() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 py-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="font-mono text-sm uppercase tracking-[0.18em] text-secondary">
            which-model
          </p>
          <h1 className="font-mono text-3xl font-semibold leading-tight text-primary sm:text-5xl">
            See how the model picker works before you sign in.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-secondary">
            Browse generated artifacts, mock screenshots from real test runs,
            and the short workflow. No email required: sign up with just a
            username and password.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {["Create an account", "Describe the task", "Review the ranking"].map(
            (step, index) => (
              <div className="border border-border bg-surface p-4" key={step}>
                <p className="font-mono text-xs uppercase text-secondary">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm text-primary">{step}</p>
              </div>
            ),
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex min-h-10 items-center justify-center border border-accent bg-accent px-4 py-2 font-mono text-sm font-medium text-black transition hover:bg-primary"
            href="/auth/signup"
          >
            Sign up
          </Link>
          <Link
            className="inline-flex min-h-10 items-center justify-center border border-border bg-surface px-4 py-2 font-mono text-sm font-medium text-primary transition hover:border-secondary"
            href="/auth/signin"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <div
          aria-label="Generated task analysis artifact"
          className="border border-border bg-surface p-4"
          role="img"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-secondary">
              Generated artifact
            </p>
            <span className="font-mono text-xs text-accent">passed</span>
          </div>
          <div className="mt-4 space-y-3">
            {artifactRows.map((row) => (
              <div className="grid gap-2 sm:grid-cols-[6.5rem_1fr]" key={row.label}>
                <span className="font-mono text-xs text-secondary">{row.label}</span>
                <span className="text-sm text-primary">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1" aria-hidden="true">
            {[56, 74, 42, 88, 63, 95, 51].map((height, index) => (
              <span
                className="block border border-border bg-bg"
                key={`${height}-${index}`}
                style={{ height: `${height}px` }}
              >
                <span className="block h-full bg-accent opacity-80" />
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {mockRuns.map((run) => (
            <div className="border border-border bg-surface p-4" key={run.title}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase text-secondary">
                    {run.status}
                  </p>
                  <h2 className="mt-2 font-mono text-base font-semibold text-primary">
                    {run.title}
                  </h2>
                </div>
                <span className="border border-success px-2 py-1 font-mono text-xs text-success">
                  200
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {run.rows.map((row, index) => (
                  <div
                    className="flex items-center justify-between gap-3 border border-border bg-bg px-3 py-2"
                    key={row}
                  >
                    <span className="text-sm text-primary">{row}</span>
                    <span className="font-mono text-xs text-secondary">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
