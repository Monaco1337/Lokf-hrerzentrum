/**
 * Edge middleware.
 *
 *  1. Canonical-host enforcement (all routes): permanently (308) redirects
 *     every non-canonical host variant (www, umlaut, punycode) to the single
 *     canonical host from `CANONICAL_HOST`, preserving path + query. This keeps
 *     auth cookies/sessions on exactly ONE domain so an IDN/www variant can
 *     never present a "logged out" request that then crashes server rendering.
 *  2. Auth-gating of /crm/* (except /crm/login) via the signed session cookie.
 *
 * NOTE: This file uses `jose` directly (not AuthService) because Next.js
 * middleware runs on the Edge runtime, which does not support all Node APIs.
 * The signing secret and cookie name match `AuthService` exactly. Env vars are
 * read straight off `process.env` (not the zod `serverEnv`) for the same
 * Edge-compatibility reason.
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

/**
 * If a canonical host is configured and the current request is on a different,
 * real (non-local, non-preview) host, return a 308 redirect to the canonical
 * host. Otherwise `null` (no redirect).
 */
function canonicalHostRedirect(req: NextRequest): NextResponse | null {
  const canonical = process.env.CANONICAL_HOST?.trim().toLowerCase();
  if (!canonical) return null;

  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (!host || host === canonical) return null;

  // Never touch local development or ephemeral preview deployments.
  if (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".vercel.app")
  ) {
    return null;
  }

  // Do not 308 API/webhook traffic: server-to-server callers (Meta, cron,
  // Resend webhooks) may not follow redirects and should stay host-agnostic.
  if (req.nextUrl.pathname.startsWith("/api/")) return null;

  const url = req.nextUrl.clone();
  url.host = canonical;
  url.protocol = "https:";
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  // 1. Canonicalise the host BEFORE any auth/session logic runs.
  const canonicalRedirect = canonicalHostRedirect(req);
  if (canonicalRedirect) return canonicalRedirect;

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
  // Run on every route (so canonical-host enforcement covers the whole domain)
  // except Next internals and static assets. The /crm auth logic inside the
  // middleware still only applies to /crm/* paths.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
