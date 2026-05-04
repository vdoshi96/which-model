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
  signInSchema,
} from "@/lib/validators/auth";

export function SignInForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setError("");
    setFieldErrors({});
    const parsed = signInSchema.safeParse({ username, password });

    if (!parsed.success) {
      setFieldErrors(getAuthFieldErrors(parsed.error));
      return;
    }

    setIsSubmitting(true);
    const result = await signIn("credentials", {
      username: parsed.data.username,
      password: parsed.data.password,
      redirect: false,
    });
    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid username or password.");
      return;
    }

    router.push(getSafeCallbackUrl());
    router.refresh();
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full space-y-4">
        <h1 className="font-mono text-2xl font-semibold">Sign in</h1>
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
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button className="w-full" disabled={isSubmitting} onClick={handleSignIn}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </Card>
    </section>
  );
}

function getSafeCallbackUrl(): string {
  const callbackUrl = new URLSearchParams(window.location.search).get(
    "callbackUrl",
  );

  if (!callbackUrl) {
    return "/";
  }

  try {
    const parsed = new URL(callbackUrl, window.location.origin);

    if (parsed.origin !== window.location.origin) {
      return "/";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
