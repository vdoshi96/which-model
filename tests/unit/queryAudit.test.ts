import { describe, expect, it } from "vitest";

import {
  buildQueryLogData,
  buildResultAuditPayload,
  hashSensitiveValue,
} from "../../src/lib/queryAudit";

describe("query audit logging", () => {
  it("stores hashes instead of raw prompt and IP text", () => {
    const task =
      "  Compare frontier models for a confidential M&A diligence workflow with internal client notes.  ";

    const logData = buildQueryLogData({
      task,
      ipAddress: "203.0.113.10",
      userId: "user_1",
      result: {
        taskSummary: "Confidential M&A diligence comparison.",
        dimensions: { reasoning: 1 },
        recommendations: [
          {
            model: { name: "GPT-5.5", provider: "OpenAI" },
            score: 91.2,
          },
        ],
      },
    });

    expect(logData).toEqual(
      expect.objectContaining({
        userId: "user_1",
        taskHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        ipHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(logData).not.toHaveProperty("taskText");
    expect(logData).not.toHaveProperty("ipAddress");
    expect(logData).not.toHaveProperty("taskPreview");
    expect(JSON.stringify(logData.resultJson)).not.toContain(
      "Confidential M&A diligence comparison.",
    );
  });

  it("builds compact result audit payloads for recommendations and comparisons", () => {
    expect(
      buildResultAuditPayload({
        taskSummary: "User-specific task summary",
        dimensions: { coding: 1 },
        recommendations: [
          { model: { name: "GPT-5.5", provider: "OpenAI" }, score: 88.8 },
        ],
      }),
    ).toEqual({
      taskSummaryHash: hashSensitiveValue("User-specific task summary"),
      dimensions: { coding: 1 },
      resultCount: 1,
      models: [{ name: "GPT-5.5", provider: "OpenAI", score: 88.8 }],
    });

    expect(
      buildResultAuditPayload({
        taskSummary: "Another task summary",
        dimensions: { reasoning: 1 },
        models: [
          { name: "Claude Opus 4.7", provider: "Anthropic", weightedScore: 90 },
        ],
      }),
    ).toEqual(
      expect.objectContaining({
        resultCount: 1,
        models: [
          { name: "Claude Opus 4.7", provider: "Anthropic", score: 90 },
        ],
      }),
    );
  });
});
