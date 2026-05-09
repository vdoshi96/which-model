"use client";

import { type FormEvent, useState } from "react";
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
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setApiError("");
    setFieldErrors({});

    const parsed = signInSchema.safeParse({ username, password });

    if (!parsed.success) {
      setFieldErrors(getAuthFieldErrors(parsed.error));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        username: parsed.data.username,
        password: parsed.data.password,
        redirect: false,
      });

      if (result?.error) {
        setApiError("Invalid username or password.");
        return;
      }

      router.push(getSafeCallbackUrl());
      router.refresh();
    } catch {
      setApiError("Could not sign in. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-1">
      <Card className="w-full border-border-strong bg-raised">
        <form
          className="space-y-5"
          data-testid="signin-form"
          onSubmit={handleSignIn}
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-secondary">
              Use your which-model username and password.
            </p>
          </div>
          {apiError ? (
            <div className="rounded-[6px] border border-danger/70 bg-danger/10 p-3 text-sm text-danger">
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
              autoComplete="current-password"
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors({});
                setApiError("");
              }}
              placeholder="Password"
              type="password"
              value={password}
            />
          </label>
          {fieldErrors.password ? (
            <p className="text-sm text-danger">{fieldErrors.password}</p>
          ) : null}
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
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
