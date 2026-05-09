"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  function handleSignOut() {
    void signOut({ callbackUrl: "/" });
  }

  return (
    <Button className="min-h-9 px-3 py-1.5" onClick={handleSignOut} variant="secondary">
      Sign out
    </Button>
  );
}
