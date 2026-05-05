import { Badge } from "./ui/Badge";

interface BenchmarkBadgeProps {
  source: string;
  score: number;
}

const SOURCE_STYLES: Record<string, { label: string; className: string }> = {
  catalog_prior: {
    label: "Catalog prior",
    className: "border-accent text-accent",
  },
  aider_polyglot: {
    label: "Aider",
    className: "border-cyan-300 text-cyan-200",
  },
  artificial_analysis: {
    label: "Artificial Analysis",
    className: "border-warning text-warning",
  },
  bfcl: {
    label: "BFCL",
    className: "border-fuchsia-300 text-fuchsia-200",
  },
  hf_leaderboard: {
    label: "HF Leaderboard",
    className: "border-secondary text-primary",
  },
  livebench: {
    label: "LiveBench",
    className: "border-success text-success",
  },
  lmsys_arena: {
    label: "LMSYS Arena",
    className: "border-accent text-accent",
  },
  swe_bench: {
    label: "SWE-bench",
    className: "border-blue-300 text-blue-200",
  },
};

function formatSource(source: string) {
  return (
    SOURCE_STYLES[source]?.label ??
    source
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function BenchmarkBadge({ source, score }: BenchmarkBadgeProps) {
  return (
    <Badge className={SOURCE_STYLES[source]?.className}>
      {formatSource(source)} {score.toFixed(2)}
    </Badge>
  );
}
