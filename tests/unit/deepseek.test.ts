
export {};

const mockCreate = jest.fn();

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  }),
}));

describe("interpretTask", () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreate.mockReset();
    process.env.DEEPSEEK_API_KEY = "test-key";
    process.env.DEEPSEEK_BASE_URL = "https://api.deepseek.test";
  });

  it("sends the hardcoded classifier prompt and parses valid JSON", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              refused: false,
              dimensions: {
                reasoning: 0.8,
                coding: 0.3,
                math: 0.1,
                instruction_following: 0.6,
                overall: 0.5,
                speed: 0.2,
                cost_efficiency: 0.4,
              },
              summary: "This task needs careful reasoning. Cost matters a little.",
            }),
          },
        },
      ],
    });

    const { interpretTask, DEEPSEEK_SYSTEM_PROMPT } = await import(
      "@/lib/deepseek"
    );
    const result = await interpretTask("Pick an LLM for analyzing contracts.");

    expect(result).toEqual({
      refused: false,
      dimensions: {
        reasoning: 0.8,
        coding: 0.3,
        math: 0.1,
        instruction_following: 0.6,
        overall: 0.5,
        speed: 0.2,
        cost_efficiency: 0.4,
      },
      summary: "This task needs careful reasoning. Cost matters a little.",
    });
    expect(mockCreate).toHaveBeenCalledWith({
      model: "deepseek-chat",
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DEEPSEEK_SYSTEM_PROMPT },
        {
          role: "user",
          content: "Task: Pick an LLM for analyzing contracts.",
        },
      ],
    });
    expect(DEEPSEEK_SYSTEM_PROMPT).toContain(
      "For applied software tasks such as UI redesign",
    );
    expect(DEEPSEEK_SYSTEM_PROMPT).toContain(
      "avoid putting all weight on a single dimension",
    );
    expect(DEEPSEEK_SYSTEM_PROMPT).toContain(
      "For creative writing tasks such as songs",
    );
    expect(DEEPSEEK_SYSTEM_PROMPT).toContain(
      "use high weights for overall, creative_writing, and instruction_following",
    );
    expect(DEEPSEEK_SYSTEM_PROMPT).toContain(
      "use cost_efficiency only when the user mentions budget",
    );
  });

  it("builds creative writing intent with high creative writing expectations", async () => {
    const {
      buildRecommendationIntent,
      defaultRecommendationPreferences,
    } = await import("@/lib/recommendation/preferences");

    const intent = buildRecommendationIntent({
      dimensions: {
        reasoning: 0.2,
        coding: 0,
        math: 0,
        instruction_following: 0.82,
        creative_writing: 0.88,
        overall: 0.91,
        speed: 0,
        cost_efficiency: 0,
      },
      preferences: defaultRecommendationPreferences,
      summary: "Songs need broad quality and careful instruction following.",
    });

    expect(intent.weights.overall).toBeGreaterThanOrEqual(0.85);
    expect(intent.weights.creative_writing).toBe(0.88);
    expect(intent.weights.instruction_following).toBeGreaterThanOrEqual(0.75);
  });

  it("zeros cost efficiency unless the task or checklist preferences request cost sensitivity", async () => {
    const {
      buildRecommendationIntent,
      defaultRecommendationPreferences,
    } = await import("@/lib/recommendation/preferences");
    const dimensions = {
      reasoning: 0.4,
      coding: 0,
      math: 0,
      instruction_following: 0.7,
      overall: 0.8,
      speed: 0,
      cost_efficiency: 0,
    };

    expect(
      buildRecommendationIntent({
        dimensions,
        preferences: defaultRecommendationPreferences,
        summary: "Quality matters most.",
      }).weights.cost_efficiency,
    ).toBe(0);
    expect(
      buildRecommendationIntent({
        dimensions,
        preferences: {
          ...defaultRecommendationPreferences,
          costSensitive: true,
        },
        summary: "Quality matters, but cost is important.",
      }).weights.cost_efficiency,
    ).toBeGreaterThanOrEqual(0.75);
    expect(
      buildRecommendationIntent({
        dimensions: {
          ...dimensions,
          cost_efficiency: 0.6,
        },
        preferences: defaultRecommendationPreferences,
        summary: "The user asked for an inexpensive option.",
      }).weights.cost_efficiency,
    ).toBe(0.6);
  });

  it("preserves interpreted speed unless the latency preference boosts it", async () => {
    const {
      buildRecommendationIntent,
      defaultRecommendationPreferences,
    } = await import("@/lib/recommendation/preferences");
    const dimensions = {
      reasoning: 0.2,
      coding: 0,
      math: 0,
      instruction_following: 0.4,
      overall: 0.4,
      speed: 0.45,
      cost_efficiency: 0,
    };

    expect(
      buildRecommendationIntent({
        dimensions,
        preferences: defaultRecommendationPreferences,
        summary: "The user asked for real-time chat.",
      }).weights.speed,
    ).toBe(0.45);
    expect(
      buildRecommendationIntent({
        dimensions,
        preferences: {
          ...defaultRecommendationPreferences,
          latencySensitive: true,
        },
        summary: "The user checked low latency.",
      }).weights.speed,
    ).toBeGreaterThanOrEqual(0.75);
  });

  it("caps user input at 500 characters before sending to DeepSeek", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              refused: true,
              reason: "Not an LLM selection task.",
            }),
          },
        },
      ],
    });

    const { interpretTask } = await import("@/lib/deepseek");
    await interpretTask("x".repeat(600));

    const call = mockCreate.mock.calls[0]?.[0];
    expect(call.messages[1].content).toBe(`Task: ${"x".repeat(500)}`);
  });

  it("rejects malformed DeepSeek JSON", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "{\"refused\":false}" } }],
    });

    const { interpretTask } = await import("@/lib/deepseek");

    await expect(interpretTask("Rank coding models.")).rejects.toThrow(
      "DeepSeek returned invalid task interpretation.",
    );
  });
});
