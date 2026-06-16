/**
 * Edge middleware - protects /crm/* (except /crm/login).
 *
 * Verifies the signed session cookie via `jose` HS256 against
 * `CRM_SESSION_SECRET`. On failure, redirects to /crm/login.
 *
 * NOTE: This file uses `jose` directly (not AuthService) because Next.js
 * middleware runs on the Edge runtime, which does not support all Node APIs.
 * The signing secret and cookie name match `AuthService` exactly.
 */
import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "crm_session";

function getSecret(): Uint8Array {
  const raw =
    process.env.CRM_SESSION_SECRET ||
    "dev-insecure-session-secret-do-not-use-in-prod-please-change-me";
  return new TextEncoder().encode(raw);
}

function withPathname(req: NextRequest, pathname: string): NextResponse {
  // Forward an `x-pathname` request header so server components (e.g. the
  // CRM layout) can detect which route is rendering and adjust their
  // chrome accordingly.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/crm")) return NextResponse.next();
  if (pathname.startsWith("/crm/login")) return withPathname(req, pathname);

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/crm/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return withPathname(req, pathname);
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/crm/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/crm/:path*"],
};
