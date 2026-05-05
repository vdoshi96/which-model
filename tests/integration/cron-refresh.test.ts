
export {};

const mockRefreshBenchmarkData = jest.fn();

jest.mock("@/lib/benchmarkSources", () => ({
  refreshBenchmarkData: mockRefreshBenchmarkData,
}));

describe("refresh benchmarks cron route", () => {
  beforeEach(() => {
    jest.resetModules();
    mockRefreshBenchmarkData.mockReset().mockResolvedValue({
      modelsProcessed: 24,
      scoresProcessed: 96,
      errors: [],
    });
  });

  it("returns 401 when the Authorization header is missing", async () => {
    process.env.CRON_SECRET = "test-secret";
    const { GET } = await import("@/app/api/cron/refresh-benchmarks/route");

    const response = await GET(
      new Request("http://localhost/api/cron/refresh-benchmarks"),
    );

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("returns 401 when the Authorization header is incorrect", async () => {
    process.env.CRON_SECRET = "test-secret";
    const { GET } = await import("@/app/api/cron/refresh-benchmarks/route");

    const response = await GET(
      new Request("http://localhost/api/cron/refresh-benchmarks", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 410 and does not update ranking data when authorized", async () => {
    process.env.CRON_SECRET = "test-secret";
    const { GET } = await import("@/app/api/cron/refresh-benchmarks/route");

    const response = await GET(
      new Request("http://localhost/api/cron/refresh-benchmarks", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      ok: false,
      error:
        "Automatic benchmark refresh is disabled. Use the manual curated catalog refresh runbook.",
    });
    expect(mockRefreshBenchmarkData).not.toHaveBeenCalled();
  });
});
