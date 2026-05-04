import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/results") ||
    request.nextUrl.pathname.startsWith("/compare");
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: shouldUseSecureCookies(request),
  });

  if (isProtectedRoute && !token) {
    const signInUrl = new URL("/auth/signin", request.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/results/:path*", "/compare/:path*"],
};

function shouldUseSecureCookies(request: NextRequest) {
  const configuredUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;

  if (configuredUrl) {
    try {
      return new URL(configuredUrl).protocol === "https:";
    } catch {
      return request.nextUrl.protocol === "https:";
    }
  }

  return request.nextUrl.protocol === "https:";
}
