import type { RankedModel } from "@/types/model";

import { BenchmarkBadge } from "./BenchmarkBadge";
import { Card } from "./ui/Card";

interface ModelCardProps {
  recommendation: RankedModel;
}

export function ModelCard({ recommendation }: ModelCardProps) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-secondary">
            #{recommendation.rank}
          </p>
          <h2 className="font-mono text-xl font-semibold">
            {recommendation.model.name}
          </h2>
          <p className="text-sm text-secondary">{recommendation.model.provider}</p>
        </div>
        <p className="font-mono text-2xl text-accent">
          {recommendation.score.toFixed(1)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {recommendation.benchmarksUsed.slice(0, 3).map((benchmark) => (
          <BenchmarkBadge
            key={`${benchmark.source}-${benchmark.dimension}`}
            score={benchmark.score}
            source={benchmark.source}
          />
        ))}
      </div>
    </Card>
  );
}
