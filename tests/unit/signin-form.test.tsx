/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockSignIn = jest.fn();

jest.mock("next-auth/react", () => ({
  signIn: mockSignIn,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const { SignInForm } = require(
  "@/components/SignInForm",
) as typeof import("@/components/SignInForm");

describe("SignInForm", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockSignIn.mockReset().mockResolvedValue({ ok: true });
    window.history.replaceState({}, "", "/auth/signin");
  });

  it("submits the sign-in form when pressing Enter in the password field", async () => {
    render(<SignInForm />);

    fireEvent.change(screen.getByLabelText(/Username/i), {
      target: { value: "valid_user" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "valid_password" },
    });
    fireEvent.submit(screen.getByTestId("signin-form"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        username: "valid_user",
        password: "valid_password",
        redirect: false,
      });
    });
    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockRefresh).toHaveBeenCalled();
  });
});
