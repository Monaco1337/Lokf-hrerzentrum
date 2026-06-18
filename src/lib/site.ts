/**
 * Single source of truth for the canonical public site URL and brand name.
 *
 * Both the App-Router metadata (layout) and the route handlers (sitemap,
 * robots) must resolve the same origin. Previously sitemap/robots fell back to
 * an example domain while layout fell back to the real one — which silently
 * published wrong URLs to crawlers when NEXT_PUBLIC_SITE_URL was unset. This
 * helper removes that drift.
 */
export const SITE_NAME = "Lokführerzentrum.de";

const FALLBACK_SITE_URL = "https://lokfuehrerzentrum.de";

/**
 * Resolve the canonical origin without a trailing slash, tolerating a missing
 * or malformed NEXT_PUBLIC_SITE_URL (e.g. an unreplaced "<placeholder>") so it
 * can never crash `new URL()` during the build's metadata collection.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return FALLBACK_SITE_URL;
  try {
    return new URL(raw).toString().replace(/\/$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

/** Build an absolute URL for a site-relative path (`/wissen` → full URL). */
export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
