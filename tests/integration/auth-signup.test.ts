export {};

const mockHash = jest.fn();
const mockUserFindUnique = jest.fn();
const mockUserCreate = jest.fn();

jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: mockHash,
  },
}));

jest.mock("@/lib/db", () => ({
  getPrisma: jest.fn(() => ({
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
  })),
}));

describe("signup API route", () => {
  beforeEach(() => {
    jest.resetModules();
    mockHash.mockReset().mockResolvedValue("hashed-password");
    mockUserFindUnique.mockReset().mockResolvedValue(null);
    mockUserCreate.mockReset().mockResolvedValue({ id: "user_1" });
  });

  it("validates, hashes, and creates a username/password account", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username: "valid_user1", password: "password1" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { username: "valid_user1" },
    });
    expect(mockHash).toHaveBeenCalledWith("password1", 12);
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: {
        username: "valid_user1",
        passwordHash: "hashed-password",
      },
    });
  });

  it("returns a clear duplicate username error", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "existing_user" });
    const { POST } = await import("@/app/api/auth/signup/route");

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username: "valid_user1", password: "password1" }),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Username is already taken.",
    });
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid username and password inputs before DB access", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username: "bad user", password: "password" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid signup details." });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
  });
});
