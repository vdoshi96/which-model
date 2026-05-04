"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  type AuthFieldErrors,
  getAuthFieldErrors,
  signUpSchema,
} from "@/lib/validators/auth";

export function SignUpForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp() {
    setApiError("");
    setFieldErrors({});
    setConfirmPasswordError("");

    const parsed = signUpSchema.safeParse({ username, password });

    if (!parsed.success) {
      setFieldErrors(getAuthFieldErrors(parsed.error));
      return;
    }

    if (parsed.data.password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string; fieldErrors?: AuthFieldErrors }
          | null;
        setFieldErrors(data?.fieldErrors ?? {});
        setApiError(data?.error ?? "Could not create account.");
        return;
      }

      const signInResult = await signIn("credentials", {
        username: parsed.data.username,
        password: parsed.data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setApiError("Account created. Please sign in.");
        router.push("/auth/signin");
        return;
      }

      router.push("/");
      router.refresh();
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
              setFieldErrors({});
              setApiError("");
            }}
            placeholder="vishal"
            value={username}
          />
        </label>
        {fieldErrors.username ? (
          <p className="text-sm text-danger">{fieldErrors.username}</p>
        ) : null}
        <label className="block space-y-2">
          <span className="font-mono text-xs uppercase text-secondary">
            Password
          </span>
          <Input
            autoComplete="new-password"
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors({});
              setApiError("");
            }}
            placeholder="At least 8 characters"
            type="password"
            value={password}
          />
        </label>
        {fieldErrors.password ? (
          <p className="text-sm text-danger">{fieldErrors.password}</p>
        ) : null}
        <label className="block space-y-2">
          <span className="font-mono text-xs uppercase text-secondary">
            Confirm password
          </span>
          <Input
            autoComplete="new-password"
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setConfirmPasswordError("");
              setApiError("");
            }}
            placeholder="Repeat password"
            type="password"
            value={confirmPassword}
          />
        </label>
        {confirmPasswordError ? (
          <p className="text-sm text-danger">{confirmPasswordError}</p>
        ) : null}
        <Button className="w-full" disabled={isSubmitting} onClick={handleSignUp}>
          {isSubmitting ? "Creating account..." : "Sign up"}
        </Button>
      </Card>
    </section>
  );
}
