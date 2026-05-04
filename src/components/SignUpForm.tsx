"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function SignUpForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignUp() {
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(data?.error ?? "Could not create account.");
    }
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
        <Input
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          value={password}
        />
        <Input
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm password"
          type="password"
          value={confirmPassword}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button className="w-full" onClick={handleSignUp}>
          Sign up
        </Button>
      </Card>
    </section>
  );
}
