import { describe, expect, it } from "vitest";

import { compareRequestSchema } from "@/lib/validators/compare";
import { recommendRequestSchema } from "@/lib/validators/recommend";

describe("request validators", () => {
  it("accepts a recommendation task up to 500 characters", () => {
    expect(recommendRequestSchema.safeParse({ task: "x".repeat(500) }).success).toBe(
      true,
    );
    expect(recommendRequestSchema.safeParse({ task: "x".repeat(501) }).success).toBe(
      false,
    );
  });

  it("requires between two and five comparison model names", () => {
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
  });
});
