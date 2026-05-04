import { redirect } from "next/navigation";

import { SignInForm } from "@/components/SignInForm";
import { auth } from "@/lib/auth";

type SignInPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string | string[];
  }>;
};

export default async function SignInPage({
  searchParams,
}: SignInPageProps) {
  const session = await auth();

  if (session?.user) {
    const resolvedSearchParams = await searchParams;

    redirect(getSafeCallbackPath(resolvedSearchParams?.callbackUrl));
  }

  return <SignInForm />;
}

function getSafeCallbackPath(callbackUrl: string | string[] | undefined) {
  const rawCallbackUrl = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;

  if (!rawCallbackUrl) {
    return "/";
  }

  if (rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")) {
    return rawCallbackUrl;
  }

  try {
    const parsed = new URL(rawCallbackUrl);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "/";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  } catch {
    return "/";
  }
}
