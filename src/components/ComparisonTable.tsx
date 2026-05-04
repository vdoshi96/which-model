import type { ComparedModel } from "@/types/api";

interface ComparisonTableProps {
  models: ComparedModel[];
}

export function ComparisonTable({ models }: ComparisonTableProps) {
  if (models.length === 0) {
    return (
      <div className="border border-border bg-surface p-6 text-secondary">
        Comparison results will appear here after AGENT-005 connects the flow.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[640px] border-collapse bg-surface text-sm">
        <thead>
          <tr>
            <th className="border-b border-border p-3 text-left">Metric</th>
            {models.map((model) => (
              <th className="border-b border-border p-3 text-left" key={model.name}>
                {model.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-b border-border p-3">Weighted score</td>
            {models.map((model) => (
              <td className="border-b border-border p-3 font-mono" key={model.name}>
                {model.weightedScore.toFixed(1)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
