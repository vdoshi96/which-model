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
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp() {
    setError("");
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
      setError(data?.error ?? "Could not create account.");
      setIsSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      username: parsed.data.username,
      password: parsed.data.password,
      redirect: false,
    });
    setIsSubmitting(false);

    if (signInResult?.error) {
      setError("Account created. Please sign in.");
      router.push("/auth/signin");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full space-y-4">
        <h1 className="font-mono text-2xl font-semibold">Sign up</h1>
        <Input
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
          value={username}
        />
        {fieldErrors.username ? (
          <p className="text-sm text-danger">{fieldErrors.username}</p>
        ) : null}
        <Input
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          value={password}
        />
        {fieldErrors.password ? (
          <p className="text-sm text-danger">{fieldErrors.password}</p>
        ) : null}
        <Input
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm password"
          type="password"
          value={confirmPassword}
        />
        {confirmPasswordError ? (
          <p className="text-sm text-danger">{confirmPasswordError}</p>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button className="w-full" disabled={isSubmitting} onClick={handleSignUp}>
          {isSubmitting ? "Creating account..." : "Sign up"}
        </Button>
      </Card>
    </section>
  );
}
