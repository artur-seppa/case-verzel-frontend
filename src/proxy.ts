import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/organizador", "/meus-ingressos", "/portaria"];

/**
 * Checagem otimista: só confirma que o cookie existe, sem verificar a
 * assinatura (o segredo do JWT vive na API). A autorização de verdade
 * sempre acontece nos guards do NestJS a cada requisição.
 */
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
