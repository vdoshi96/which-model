import Link from "next/link";

import { auth } from "@/lib/auth";

import { SignOutButton } from "./SignOutButton";
import { Button } from "./ui/Button";

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="grid h-7 w-7 place-items-center rounded-[6px] border border-accent/45 bg-accent/10 text-accent"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20">
        <path
          d="M10 2.5 16.5 6v8L10 17.5 3.5 14V6L10 2.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M6.8 10h6.4M10 6.8v6.4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    </span>
  );
}

export async function NavBar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/88 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="inline-flex items-center gap-3 text-base font-semibold" href="/">
          <BrandMark />
          <span>which-model</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {session?.user ? (
            <>
              <span className="hidden h-5 w-px bg-border sm:block" />
              <span className="inline-flex max-w-36 items-center gap-2 truncate rounded-[6px] border border-transparent px-2 py-1 text-secondary sm:max-w-none">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-secondary"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3.5 17c.8-2.6 3.2-4.3 6.5-4.3s5.7 1.7 6.5 4.3"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  />
                </svg>
                {session.user.username}
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                className="rounded-[6px] px-3 py-2 text-secondary transition hover:bg-raised hover:text-primary"
                href="/auth/signin"
              >
                Sign in
              </Link>
              <Link href="/auth/signup">
                <Button className="min-h-9 px-3 py-1.5">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
