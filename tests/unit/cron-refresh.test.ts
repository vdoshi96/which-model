import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/cron/refresh-benchmarks/route";

describe("refresh benchmarks cron route", () => {
  it("returns 401 when the Authorization header is missing", async () => {
    process.env.CRON_SECRET = "test-secret";

    const response = await GET(
      new Request("http://localhost/api/cron/refresh-benchmarks"),
    );

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("returns 401 when the Authorization header is incorrect", async () => {
    process.env.CRON_SECRET = "test-secret";

    const response = await GET(
      new Request("http://localhost/api/cron/refresh-benchmarks", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );

    expect(response.status).toBe(401);
  });
});
