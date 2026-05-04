"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  function handleSignOut() {
    void signOut({ callbackUrl: "/" });
  }

  return (
    <Button onClick={handleSignOut} variant="secondary">
      Sign out
    </Button>
  );
}
