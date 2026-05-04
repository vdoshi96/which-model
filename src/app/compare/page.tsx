"use client";

import { ComparisonTable } from "@/components/ComparisonTable";
import { ModelSelector } from "@/components/ModelSelector";

export default function ComparePage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-semibold">Compare Models</h1>
        <p className="mt-2 text-secondary">
          Select two to five models for a task-specific comparison.
        </p>
      </div>
      <ModelSelector models={[]} selectedModels={[]} onChange={() => undefined} />
      <ComparisonTable models={[]} />
    </section>
  );
}
