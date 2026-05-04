
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
