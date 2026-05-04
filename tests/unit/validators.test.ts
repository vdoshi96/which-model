import { compareRequestSchema } from "@/lib/validators/compare";
import { recommendRequestSchema } from "@/lib/validators/recommend";

describe("request validators", () => {
  it("accepts and trims a recommendation task up to 500 characters", () => {
    const parsed = recommendRequestSchema.safeParse({ task: "  Rank coding LLMs  " });

    expect(parsed.success).toBe(true);
    expect(parsed.success ? parsed.data.task : null).toBe("Rank coding LLMs");
    expect(recommendRequestSchema.safeParse({ task: "x".repeat(500) }).success).toBe(
      true,
    );
    expect(recommendRequestSchema.safeParse({ task: "x".repeat(501) }).success).toBe(
      false,
    );
    expect(recommendRequestSchema.safeParse({ task: "   " }).success).toBe(false);
  });

  it("requires between two and five trimmed comparison model names", () => {
    const parsed = compareRequestSchema.safeParse({
      task: " Pick a model for coding. ",
      modelNames: [" Model A ", "Model B"],
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success ? parsed.data : null).toEqual({
      task: "Pick a model for coding.",
      modelNames: ["Model A", "Model B"],
    });
    expect(
      compareRequestSchema.safeParse({
        task: "Pick a model for coding.",
        modelNames: ["A"],
      }).success,
    ).toBe(false);
    expect(
      compareRequestSchema.safeParse({
        task: "Pick a model for coding.",
        modelNames: ["A", "B", "C", "D", "E", "F"],
      }).success,
    ).toBe(false);
    expect(
      compareRequestSchema.safeParse({
        task: "Pick a model for coding.",
        modelNames: ["A", "B"],
      }).success,
    ).toBe(true);
    expect(
      compareRequestSchema.safeParse({
        task: "Pick a model for coding.",
        modelNames: ["Model A", "   "],
      }).success,
    ).toBe(false);
    expect(
      compareRequestSchema.safeParse({
        task: "Pick a model for coding.",
        modelNames: ["Model A", " Model A "],
      }).success,
    ).toBe(false);
  });
});
