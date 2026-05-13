import type { RecommendationTier } from "@/types/api";

interface RecommendationTiersProps {
  tiers: RecommendationTier[];
}

function formatCost(input: number | null, output: number | null) {
  if (input === null && output === null) {
    return "Cost unavailable";
  }

  const inputCost = input === null ? "N/A" : `$${input.toFixed(2)}`;
  const outputCost = output === null ? "N/A" : `$${output.toFixed(2)}`;

  return `${inputCost} in / ${outputCost} out`;
}

export function RecommendationTiers({ tiers }: RecommendationTiersProps) {
  if (!tiers.length) {
    return null;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {tiers.map((tier) => {
        const recommendation = tier.recommendation;

        return (
          <section
            className="rounded-[8px] border border-border bg-surface p-4"
            key={tier.id}
          >
            <p className="font-mono text-xs uppercase text-secondary">
              {tier.label}
            </p>
            {recommendation ? (
              <>
                <h2 className="mt-3 text-xl font-semibold leading-tight text-primary">
                  {recommendation.model.name}
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  {recommendation.model.provider}
                </p>
                <div className="mt-4 grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    <span className="text-secondary">Task score</span>
                    <span className="font-mono text-primary">
                      {recommendation.score.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    <span className="text-secondary">API cost / 1M</span>
                    <span className="text-right font-mono text-primary">
                      {formatCost(
                        recommendation.model.costInputPer1M,
                        recommendation.model.costOutputPer1M,
                      )}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-secondary">
                No selected model had enough scoring evidence for this slot.
              </p>
            )}
            <p className="mt-4 text-sm leading-6 text-secondary">
              {tier.description}
            </p>
          </section>
        );
      })}
    </div>
  );
}
