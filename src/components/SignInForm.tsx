"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function SignInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignIn() {
    setError("");
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid username or password.");
    }
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
        <Input
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          value={password}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button className="w-full" onClick={handleSignIn}>
          Sign in
        </Button>
      </Card>
    </section>
  );
}
