import type { RankingContribution } from "@/types/model";

export function explainRanking({
  contributions,
  evidenceCount,
  missingEvidence,
  modelName,
  provenanceSummary,
  unavailableEvidence,
}: {
  contributions: RankingContribution[];
  evidenceCount: number;
  missingEvidence: string[];
  modelName: string;
  provenanceSummary: Record<string, number>;
  unavailableEvidence: string[];
}) {
  const topSignals = contributions
    .filter((contribution) => contribution.weight > 0)
    .sort((left, right) => right.contribution - left.contribution)
    .slice(0, 3)
    .map((contribution) => contribution.label.replaceAll("_", " "));

  const signalText =
    topSignals.length > 0
      ? `curated ${topSignals.join(", ")} signals`
      : "available curated signals";
  const provenanceText = formatProvenanceSummary(provenanceSummary);
  const missingText =
    missingEvidence.length > 0
      ? ` Missing high-weight evidence: ${missingEvidence.join(", ")}.`
      : "";
  const unavailableText =
    unavailableEvidence.length > 0
      ? ` Catalog has no dedicated rows yet for ${unavailableEvidence.join(", ")}.`
      : "";

  return `${modelName} ranks from ${signalText} across ${evidenceCount} curated score rows (${provenanceText}).${missingText}${unavailableText}`;
}

function formatProvenanceSummary(provenanceSummary: Record<string, number>) {
  const entries = Object.entries(provenanceSummary);

  if (entries.length === 0) {
    return "unknown provenance";
  }

  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([provenance, count]) => `${provenance.replaceAll("_", " ")}: ${count}`)
    .join(", ");
}
