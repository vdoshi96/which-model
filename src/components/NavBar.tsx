import Link from "next/link";

import { auth } from "@/lib/auth";

import { Button } from "./ui/Button";

export async function NavBar() {
  const session = await auth();

  return (
    <header className="border-b border-border bg-bg">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link className="font-mono text-lg font-semibold" href="/">
          which-model
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {session?.user ? (
            <span className="font-mono text-secondary">
              {session.user.username}
            </span>
          ) : (
            <>
              <Link className="text-secondary hover:text-primary" href="/auth/signin">
                Sign in
              </Link>
              <Link href="/auth/signup">
                <Button>Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
