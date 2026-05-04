/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";

const mockAuth = jest.fn();
const mockRedirect = jest.fn();

jest.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

jest.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

jest.mock("@/components/SignInForm", () => ({
  SignInForm: () => <div>Sign in form</div>,
}));

describe("SignInPage", () => {
  beforeEach(() => {
    jest.resetModules();
    mockAuth.mockReset();
    mockRedirect.mockReset();
  });

  it("shows the sign-in form for anonymous visitors", async () => {
    mockAuth.mockResolvedValue(null);
    const { default: SignInPage } = await import("@/app/auth/signin/page");

    render(await SignInPage({}));

    expect(screen.getByText("Sign in form")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects authenticated visitors to the callback path", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin",
        isAdmin: true,
        username: "admin",
      },
    });
    const { default: SignInPage } = await import("@/app/auth/signin/page");

    await SignInPage({
      searchParams: Promise.resolve({
        callbackUrl:
          "https://which-model.vercel.app/compare?models=GPT-5.3%2CGPT-5.4",
      }),
    });

    expect(mockRedirect).toHaveBeenCalledWith(
      "/compare?models=GPT-5.3%2CGPT-5.4",
    );
  });
});
