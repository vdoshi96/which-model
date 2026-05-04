import type { RankedModel } from "@/types/model";

import { ModelCard } from "./ModelCard";

interface RankingListProps {
  recommendations: RankedModel[];
}

export function RankingList({ recommendations }: RankingListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="border border-border bg-surface p-6 text-secondary">
        Recommendations will appear here after AGENT-004 connects the API.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.map((recommendation) => (
        <ModelCard
          key={recommendation.model.name}
          recommendation={recommendation}
        />
      ))}
    </div>
  );
}
