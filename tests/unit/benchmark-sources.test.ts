import { extractArtificialRowsFromHtml } from "@/lib/benchmarkSources/artificialAnalysis";
import { extractAiderRowsFromHtml } from "@/lib/benchmarkSources/aider";
import { extractBfclRowsFromCsv } from "@/lib/benchmarkSources/bfcl";
import { extractHfRows } from "@/lib/benchmarkSources/hfLeaderboard";
import { extractLiveBenchJudgmentRecords } from "@/lib/benchmarkSources/livebench";
import { extractSweBenchRowsFromHtml } from "@/lib/benchmarkSources/sweBench";

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

  it("extracts Aider polyglot leaderboard rows from HTML", () => {
    const html = `
      <tr id="main-row-0">
        <td><button>▶</button></td>
        <td><span>gpt-5 (high)</span></td>
        <td class="bar-cell"><span>88.0%</span></td>
        <td class="bar-cell cost-bar-cell"><span>$29.08</span></td>
        <td class="col-command"><span><code>aider --model openai/gpt-5</code></span></td>
        <td class="col-conform"><span>91.6%</span></td>
        <td class="col-edit-format"><span>diff</span></td>
      </tr>
    `;

    expect(extractAiderRowsFromHtml(html)).toEqual([
      {
        modelName: "gpt-5",
        provider: "OpenAI",
        percentCorrect: 88,
        cost: 29.08,
      },
    ]);
  });

  it("keeps the best Aider score when the same base model appears with multiple settings", () => {
    const html = `
      <tr id="main-row-0">
        <td></td><td><span>gpt-5 (high)</span></td>
        <td class="bar-cell"><span>88.0%</span></td><td><span>$29.08</span></td>
        <td class="col-command"><span><code>aider --model openai/gpt-5</code></span></td>
      </tr>
      <tr id="main-row-1">
        <td></td><td><span>gpt-5 (low)</span></td>
        <td class="bar-cell"><span>81.3%</span></td><td><span>$10.37</span></td>
        <td class="col-command"><span><code>aider --model openai/gpt-5</code></span></td>
      </tr>
    `;

    expect(extractAiderRowsFromHtml(html)).toEqual([
      {
        modelName: "gpt-5",
        provider: "OpenAI",
        percentCorrect: 88,
        cost: 29.08,
      },
    ]);
  });


  it("extracts best model-level SWE-bench resolved scores from embedded leaderboard JSON", () => {
    const html = `
      <script type="application/json" id="leaderboard-data">
        [
          {
            "name": "Verified",
            "results": [
              {
                "name": "Agent + Claude",
                "resolved": 63.4,
                "tags": ["Model: claude-sonnet-4-5-20250929", "Org: Example"]
              },
              {
                "name": "Agent + Claude retry",
                "resolved": 67.2,
                "tags": ["Model: claude-sonnet-4-5-20250929", "Org: Example"]
              }
            ]
          }
        ]
      </script>
    `;

    expect(extractSweBenchRowsFromHtml(html)).toEqual([
      {
        modelName: "claude-sonnet-4-5-20250929",
        provider: "Anthropic",
        resolved: 67.2,
      },
    ]);
  });

  it("normalizes SWE-bench Hugging Face model URLs into model names", () => {
    const html = `
      <script type="application/json" id="leaderboard-data">
        [
          {
            "name": "Verified",
            "results": [
              {
                "name": "Agent + Qwen",
                "resolved": 69.6,
                "tags": ["Model: https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct"]
              }
            ]
          }
        ]
      </script>
    `;

    expect(extractSweBenchRowsFromHtml(html)).toEqual([
      {
        modelName: "Qwen3-Coder-480B-A35B-Instruct",
        provider: "Alibaba",
        resolved: 69.6,
      },
    ]);
  });

  it("extracts BFCL function-calling rows from CSV", () => {
    const csv = [
      "Rank,Overall Acc,Model,Model Link,Total Cost ($),Latency Mean (s),Organization",
      "1,77.47%,Claude-Opus-4-5-20251101 (FC),https://example.com,86.55,4.38,Anthropic",
    ].join("\n");

    expect(extractBfclRowsFromCsv(csv)).toEqual([
      {
        modelName: "Claude-Opus-4-5-20251101",
        provider: "Anthropic",
        accuracy: 77.47,
      },
    ]);
  });

  it("aggregates LiveBench judgment rows instead of treating one binary row as a leaderboard score", () => {
    expect(
      extractLiveBenchJudgmentRecords([
        { model: "deepseek-r1", category: "coding", score: 1 },
        { model: "deepseek-r1", category: "coding", score: 0 },
        { model: "qwen", category: "coding", score: 1 },
      ]),
    ).toEqual([
      {
        modelName: "deepseek-r1",
        provider: "DeepSeek",
        source: "livebench",
        dimension: "coding",
        score: 50,
        rawLabel: "LiveBench coding",
      },
    ]);
  });
});
