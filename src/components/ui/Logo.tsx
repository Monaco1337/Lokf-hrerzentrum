/**
 * Logo — single source of truth for the Lokführerzentrum.de brand identity.
 *
 * Variants:
 *   - "icon"     train-only mark with circular rail accent (transparent PNG)
 *                use on mobile header / favicon spots / square contexts
 *   - "compact"  full wordmark scaled for tight nav rows (transparent PNG)
 *                use on desktop navbar / CRM header
 *   - "full"     full wordmark scaled for hero blocks / marketing surfaces
 *   - "mono"     full wordmark presented on a subtle white brand tile so it
 *                sits cleanly on dark navy surfaces (footer)
 *
 * All variants are real PNG assets exported by the brand; nothing is hand-
 * drawn in code. Pass `className` with a height (e.g. `h-8`) — width scales
 * automatically. Default fallback is `h-auto w-auto`.
 *
 * Brand colours (kept as a single source of truth for callers that still
 * reference brand tokens, e.g. accent buttons). Fair-Train green is the
 * primary brand accent — replaces the legacy red across the whole product.
 *   navy   #0F1B3D
 *   green  #3F7248  (Tailwind `accent-600`)
 *   mute   #6B7280
 */
import Image from "next/image";

export const BRAND_COLORS = {
  navy: "#0F1B3D",
  green: "#3F7248",
  mute: "#6B7280",
} as const;

export type LogoVariant = "full" | "compact" | "icon" | "mono";

export interface LogoProps {
  variant?: LogoVariant;
  className?: string;
  ariaLabel?: string;
}

const DEFAULT_LABEL = "Lokführerzentrum.de";

// Intrinsic dimensions of the exported brand assets. Both PNGs are derived
// from a single master via scripts/process_logos.py so they always stay in
// visual sync. If you re-export the source, re-run the script and update
// these constants to the printed sizes.
const ICON_SRC = "/brand/logo-icon.png";
const ICON_W = 339;
const ICON_H = 293;

const FULL_SRC = "/brand/logo-full.png";
const FULL_W = 775;
const FULL_H = 293;

export function Logo({
  variant = "compact",
  className,
  ariaLabel = DEFAULT_LABEL,
}: LogoProps) {
  if (variant === "icon") {
    return (
      <Image
        src={ICON_SRC}
        alt={ariaLabel}
        width={ICON_W}
        height={ICON_H}
        priority
        draggable={false}
        className={["block select-none", className ?? ""].join(" ")}
        style={{ width: "auto" }}
        sizes="64px"
      />
    );
  }

  if (variant === "mono") {
    return (
      <span
        className="inline-flex items-center justify-center rounded-xl bg-white/95 px-3 py-1.5 shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_10px_32px_-14px_rgba(0,0,0,0.5)] ring-1 ring-white/15"
        aria-label={ariaLabel}
      >
        <Image
          src={FULL_SRC}
          alt={ariaLabel}
          width={FULL_W}
          height={FULL_H}
          draggable={false}
          className={["block select-none", className ?? ""].join(" ")}
          style={{ width: "auto" }}
          sizes="280px"
        />
      </span>
    );
  }

  return (
    <Image
      src={FULL_SRC}
      alt={ariaLabel}
      width={FULL_W}
      height={FULL_H}
      priority
      draggable={false}
      className={["block select-none", className ?? ""].join(" ")}
      style={{ width: "auto" }}
      sizes={variant === "full" ? "420px" : "260px"}
    />
  );
}
