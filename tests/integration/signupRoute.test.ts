import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const create = vi.fn();

vi.mock("../../src/lib/db", () => ({
  getPrisma: () => ({
    user: {
      findUnique,
      create,
    },
  }),
}));

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
    vi.resetModules();
  });

  it("creates a user with sanitized username and bcrypt hash", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({
      id: "user_1",
      username: "valid_user",
      passwordHash: "hashed",
    });
    const { POST } = await import("../../src/app/api/auth/signup/route");

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          username: "  valid_user  ",
          password: "password1",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(findUnique).toHaveBeenCalledWith({
      where: { username: "valid_user" },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        username: "valid_user",
        passwordHash: expect.not.stringContaining("password1"),
      },
      select: { id: true, username: true },
    });
  });

  it("returns a clear conflict for duplicate usernames", async () => {
    findUnique.mockResolvedValue({ id: "user_1", username: "valid_user" });
    const { POST } = await import("../../src/app/api/auth/signup/route");

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          username: "valid_user",
          password: "password1",
        }),
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe("Username is already taken.");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns validation details for invalid input", async () => {
    const { POST } = await import("../../src/app/api/auth/signup/route");

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          username: "bad user",
          password: "password",
        }),
      }),
    );
    const body = (await response.json()) as {
      error?: string;
      fieldErrors?: Record<string, string>;
    };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid signup details.");
    expect(body.fieldErrors?.username).toBeTruthy();
    expect(body.fieldErrors?.password).toBeTruthy();
  });
});
