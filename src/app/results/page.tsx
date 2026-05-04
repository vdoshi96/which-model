import { RankingList } from "@/components/RankingList";

export default function ResultsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-semibold">Recommendations</h1>
        <p className="mt-2 text-secondary">
          AGENT-006 connects this page to recommendation results.
        </p>
      </div>
      <RankingList recommendations={[]} />
    </section>
  );
}
