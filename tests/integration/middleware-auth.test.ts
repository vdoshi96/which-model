import { NextRequest } from "next/server";

const mockGetToken = jest.fn();

jest.mock("next-auth/jwt", () => ({
  getToken: mockGetToken,
}));

describe("auth middleware", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetToken.mockReset();
    process.env.NEXTAUTH_SECRET = "test-secret";
  });

  it("redirects unauthenticated protected routes to sign-in with callbackUrl", async () => {
    mockGetToken.mockResolvedValue(null);
    const { middleware } = await import("@/middleware");

    const response = await middleware(
      new NextRequest("http://localhost/results?task=hello"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/auth/signin?callbackUrl=http%3A%2F%2Flocalhost%2Fresults%3Ftask%3Dhello",
    );
    expect(mockGetToken).toHaveBeenCalledWith(
      expect.objectContaining({ secret: "test-secret" }),
    );
  });

  it("allows authenticated protected routes through", async () => {
    mockGetToken.mockResolvedValue({ sub: "user_1" });
    const { middleware } = await import("@/middleware");

    const response = await middleware(new NextRequest("http://localhost/compare"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
