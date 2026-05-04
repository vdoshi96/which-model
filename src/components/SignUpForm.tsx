"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function SignUpForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp() {
    const trimmedUsername = username.trim();

    setFieldError("");
    setApiError("");

    if (!trimmedUsername || !password || !confirmPassword) {
      setFieldError("All fields are required.");
      return;
    }

    if (trimmedUsername.length < 3) {
      setFieldError("Username must be at least 3 characters.");
      return;
    }

    if (password.length < 8 || !/\d/.test(password)) {
      setFieldError("Password must be 8+ characters and include a number.");
      return;
    }

    if (password !== confirmPassword) {
      setFieldError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setApiError(data?.error ?? "Could not create account.");
        return;
      }

      router.push("/auth/signin");
    } catch {
      setApiError("Could not create account. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-1">
      <Card className="w-full space-y-5">
        <div className="space-y-2">
          <h1 className="font-mono text-2xl font-semibold">Sign up</h1>
          <p className="text-sm text-secondary">
            Create a username-only account. No email required.
          </p>
        </div>
        {apiError ? (
          <div className="border border-danger p-3 text-sm text-danger">
            {apiError}
          </div>
        ) : null}
        <label className="block space-y-2">
          <span className="font-mono text-xs uppercase text-secondary">
            Username
          </span>
          <Input
            autoComplete="username"
            onChange={(event) => {
              setUsername(event.target.value);
              setFieldError("");
              setApiError("");
            }}
            placeholder="vishal"
            value={username}
          />
        </label>
        <label className="block space-y-2">
          <span className="font-mono text-xs uppercase text-secondary">
            Password
          </span>
          <Input
            autoComplete="new-password"
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldError("");
              setApiError("");
            }}
            placeholder="At least 8 characters"
            type="password"
            value={password}
          />
        </label>
        <label className="block space-y-2">
          <span className="font-mono text-xs uppercase text-secondary">
            Confirm password
          </span>
          <Input
            autoComplete="new-password"
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setFieldError("");
              setApiError("");
            }}
            placeholder="Repeat password"
            type="password"
            value={confirmPassword}
          />
        </label>
        {fieldError ? <p className="text-sm text-danger">{fieldError}</p> : null}
        <Button className="w-full" disabled={isSubmitting} onClick={handleSignUp}>
          {isSubmitting ? "Creating account..." : "Sign up"}
        </Button>
      </Card>
    </section>
  );
}
