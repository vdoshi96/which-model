"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function SignInForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setFieldError("");
    setApiError("");

    if (!username.trim() || !password) {
      setFieldError("Username and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setApiError("Invalid username or password.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setApiError("Could not sign in. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-1">
      <Card className="w-full space-y-5">
        <div className="space-y-2">
          <h1 className="font-mono text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-secondary">
            Use your which-model username and password.
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
            autoComplete="current-password"
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldError("");
              setApiError("");
            }}
            placeholder="Password"
            type="password"
            value={password}
          />
        </label>
        {fieldError ? <p className="text-sm text-danger">{fieldError}</p> : null}
        <Button className="w-full" disabled={isSubmitting} onClick={handleSignIn}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </Card>
    </section>
  );
}
