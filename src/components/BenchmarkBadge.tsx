import { Badge } from "./ui/Badge";

interface BenchmarkBadgeProps {
  source: string;
  score: number;
}

export function BenchmarkBadge({ source, score }: BenchmarkBadgeProps) {
  return (
    <Badge>
      {source}: {score.toFixed(1)}
    </Badge>
  );
}
