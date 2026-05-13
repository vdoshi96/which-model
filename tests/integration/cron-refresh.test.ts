
export {};

const mockRefreshBenchmarkData = jest.fn();

jest.mock("@/lib/benchmarkSources", () => ({
  refreshBenchmarkData: mockRefreshBenchmarkData,
}));

describe("refresh benchmarks cron route", () => {
  beforeEach(() => {
    jest.resetModules();
    mockRefreshBenchmarkData.mockReset().mockResolvedValue({
      recordsFetched: 120,
      modelsUpserted: 24,
      scoresUpserted: 96,
      scoresDeleted: 0,
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

  it("updates benchmark data when authorized", async () => {
    process.env.CRON_SECRET = "test-secret";
    const { GET } = await import("@/app/api/cron/refresh-benchmarks/route");

    const response = await GET(
      new Request("http://localhost/api/cron/refresh-benchmarks", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      recordsFetched: 120,
      modelsUpserted: 24,
      scoresUpserted: 96,
      scoresDeleted: 0,
    });
    expect(mockRefreshBenchmarkData).toHaveBeenCalledTimes(1);
  });
});
