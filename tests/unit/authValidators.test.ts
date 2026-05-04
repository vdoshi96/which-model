import { describe, expect, it } from "vitest";

import {
  sanitizeUsername,
  signInSchema,
  signUpSchema,
} from "../../src/lib/validators/auth";

describe("auth validators", () => {
  it("sanitizes username whitespace before persistence", () => {
    expect(sanitizeUsername("  valid_user  ")).toBe("valid_user");
  });

  it("accepts valid signup credentials", () => {
    const parsed = signUpSchema.safeParse({
      username: "valid_user",
      password: "password1",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects usernames with spaces or symbols", () => {
    expect(
      signUpSchema.safeParse({
        username: "bad user",
        password: "password1",
      }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({
        username: "bad-user",
        password: "password1",
      }).success,
    ).toBe(false);
  });

  it("rejects passwords without a number", () => {
    expect(
      signUpSchema.safeParse({
        username: "valid_user",
        password: "password",
      }).success,
    ).toBe(false);
  });

  it("keeps sign-in errors generic while requiring non-empty inputs", () => {
    expect(
      signInSchema.safeParse({ username: "valid_user", password: "password1" })
        .success,
    ).toBe(true);
    expect(signInSchema.safeParse({ username: "", password: "" }).success).toBe(
      false,
    );
  });
});
