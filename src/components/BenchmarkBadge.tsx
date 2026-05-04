import { Badge } from "./ui/Badge";

interface BenchmarkBadgeProps {
  source: string;
  score: number;
}

const SOURCE_STYLES: Record<string, { label: string; className: string }> = {
  artificial_analysis: {
    label: "Artificial Analysis",
    className: "border-warning text-warning",
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
