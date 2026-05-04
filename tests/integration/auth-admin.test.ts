export {};

const mockCompare = jest.fn();
const mockUserFindUnique = jest.fn();

jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    compare: mockCompare,
  },
}));

jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    handlers: {},
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
}));

jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: jest.fn((config) => config),
}));

jest.mock("@/lib/db", () => ({
  getPrisma: jest.fn(() => ({
    user: {
      findUnique: mockUserFindUnique,
    },
  })),
}));

describe("built-in admin auth", () => {
  beforeEach(() => {
    jest.resetModules();
    mockCompare.mockReset();
    mockUserFindUnique.mockReset();
  });

  it("authorizes the built-in admin without requiring a database user", async () => {
    const { authorizeCredentials } = await import("@/lib/auth");

    const user = await authorizeCredentials({
      username: "admin",
      password: "Codex123!",
    });

    expect(user).toEqual({
      id: "admin",
      isAdmin: true,
      name: "admin",
      username: "admin",
    });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("rejects an incorrect admin password before database lookup", async () => {
    const { authorizeCredentials } = await import("@/lib/auth");

    const user = await authorizeCredentials({
      username: "admin",
      password: "wrong-password",
    });

    expect(user).toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("marks database-backed users as non-admin", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user_1",
      username: "valid_user",
      passwordHash: "hashed-password",
    });
    mockCompare.mockResolvedValue(true);
    const { authorizeCredentials } = await import("@/lib/auth");

    const user = await authorizeCredentials({
      username: "valid_user",
      password: "password1",
    });

    expect(user).toEqual({
      id: "user_1",
      isAdmin: false,
      name: "valid_user",
      username: "valid_user",
    });
  });
});
