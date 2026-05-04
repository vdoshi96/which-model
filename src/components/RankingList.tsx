import type { RankedModel } from "@/types/model";

import { ModelCard } from "./ModelCard";

interface RankingListProps {
  recommendations: RankedModel[];
}

export function RankingList({ recommendations }: RankingListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="border border-border bg-surface p-6 text-secondary">
        Recommendations will appear here after you analyze a task.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.slice(0, 10).map((recommendation) => (
        <ModelCard
          key={recommendation.model.name}
          recommendation={recommendation}
        />
      ))}
    </div>
  );
}
