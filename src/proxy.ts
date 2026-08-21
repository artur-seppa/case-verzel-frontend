import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/organizador", "/meus-ingressos", "/portaria"];

export function proxy(request: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (isProtected && !request.cookies.has("access_token")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/organizador/:path*", "/meus-ingressos", "/portaria"],
};
