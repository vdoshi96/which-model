/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";

const mockAuth = jest.fn();

jest.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

jest.mock("@/components/TaskInput", () => ({
  TaskInput: () => <div>Question form</div>,
}));

describe("HomePage", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("shows the splash screen instead of the question form for anonymous visitors", async () => {
    mockAuth.mockResolvedValue(null);
    const { default: HomePage } = await import("@/app/page");

    render(await HomePage());

    expect(screen.getByText(/No email required/i)).toBeInTheDocument();
    expect(screen.queryByText("Question form")).not.toBeInTheDocument();
  });

  it("shows the question form after login", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user_1",
        isAdmin: false,
        username: "valid_user",
      },
    });
    const { default: HomePage } = await import("@/app/page");

    render(await HomePage());

    expect(screen.getByText("Question form")).toBeInTheDocument();
  });
});
