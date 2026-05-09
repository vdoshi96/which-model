import { cn } from "@/lib/ui";

const signals = [
  { label: "Long context (100k+)", value: 82, level: "High", tone: "cyan" },
  { label: "Structured output", value: 74, level: "High", tone: "cyan" },
  { label: "Instruction following", value: 79, level: "High", tone: "cyan" },
  { label: "Reasoning / accuracy", value: 72, level: "High", tone: "cyan" },
  { label: "Latency (p50)", value: 46, level: "Med", tone: "amber" },
  { label: "Cost (per 1M tokens)", value: 42, level: "Med", tone: "amber" },
];

const icons = ["M10 3.5 15.5 6.7v6.6L10 16.5l-5.5-3.2V6.7L10 3.5Z", "M5 5.5h10M5 10h10M5 14.5h6", "M6 4.5h8v11H6z", "M10 3.5l6 6-6 6-6-6z", "M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z", "M5 6.5h10M7 10h6M8.5 13.5h3"];

export function EvidencePreview({ className }: { className?: string }) {
  return (
    <aside className={cn("space-y-4", className)}>
      <div className="rounded-[8px] border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-primary">
            Evidence preview
          </h2>
          <span className="font-mono text-[11px] uppercase text-muted">
            top signals
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {signals.map((signal, index) => (
            <div
              className="grid grid-cols-[1rem_minmax(0,1fr)_4.6rem_2.4rem] items-center gap-3 text-xs"
              key={signal.label}
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4 text-secondary"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  d={icons[index]}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.35"
                />
              </svg>
              <span className="min-w-0 truncate text-secondary">
                {signal.label}
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-border">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    signal.tone === "cyan" ? "bg-cyan" : "bg-warning",
                  )}
                  style={{ width: `${signal.value}%` }}
                />
              </span>
              <span
                className={cn(
                  "text-right font-mono",
                  signal.tone === "cyan" ? "text-cyan" : "text-warning",
                )}
              >
                {signal.level}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[8px] border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-primary">Based on</p>
        <p className="mt-2 text-sm leading-6 text-secondary">
          Curated public benchmarks, task-weighted dimensions, and model
          metadata with evidence gaps shown explicitly.
        </p>
      </div>
    </aside>
  );
}
