import { extractArtificialRowsFromHtml } from "@/lib/benchmarkSources/artificialAnalysis";
import { extractHfRows } from "@/lib/benchmarkSources/hfLeaderboard";

describe("benchmark source adapters", () => {
  it("extracts Artificial Analysis rows from Next.js flight payloads", () => {
    const flightChunk = `31:["$","div",null,{"models":[{"id":"aa-model","name":"Example 4","modelCreatorName":"Example AI","deprecated":false,"intelligenceIndex":72.5,"price1mBlended0To3To1":1.25,"price1mInputTokens":0.5,"price1mOutputTokens":2.5,"medianOutputTokensPerSecond":128,"contextWindowTokens":64000}]}]`;
    const html = `<script>self.__next_f.push(${JSON.stringify([
      1,
      flightChunk,
    ])})</script>`;

    expect(extractArtificialRowsFromHtml(html)).toEqual([
      {
        modelName: "Example 4",
        provider: "Example AI",
        qualityScore: 72.5,
        speed: 128,
        cost: 1.25,
        contextWindow: 64000,
        costInputPer1M: 0.5,
        costOutputPer1M: 2.5,
      },
    ]);
  });

  it("extracts current Hugging Face dataset-server rows", () => {
    expect(
      extractHfRows([
        {
          model_name: "Qwen/Qwen3.5-397B-A17B",
          provider: "Qwen",
          aggregate_score: 73.57,
          mmluPro_score: 87.8,
          gsm8k_score: 91.2,
          context_window: 262144,
        },
      ]),
    ).toEqual([
      {
        modelName: "Qwen/Qwen3.5-397B-A17B",
        provider: "Qwen",
        average: 73.57,
        mmlu: 87.8,
        gsm8k: 91.2,
        contextWindow: 262144,
      },
    ]);
  });
});
