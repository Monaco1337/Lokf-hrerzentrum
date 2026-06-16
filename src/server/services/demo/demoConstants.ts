/**
 * demoConstants — single source of truth for the demo-data layer.
 *
 * Production-safety model
 * -----------------------
 * Demo rows live in the SAME tables as real data but are *always*:
 *   1. registered in `DemoSeedEntry` (authoritative `isDemo` marker — drives
 *      the one-click cleanup), and
 *   2. visibly tagged: person names carry the `[DEMO]` prefix and every row
 *      that owns a `source` column is stamped `source = "demo"`.
 *
 * Because real submitted leads never get a `DemoSeedEntry` row (nor the
 * `[DEMO]` tag / `source="demo"`), demo and real data can never be confused
 * and the reset/remove flow can only ever touch demo rows.
 */

/** Visible marker prefixed to every demo person/inquiry name. */
export const DEMO_TAG = "[DEMO]";

/** Source attribution written to every demo row that has a `source` column. */
export const DEMO_SOURCE = "demo";

/** Seed batch identifier — lets a future migration re-run a fresh batch. */
export const DEMO_BATCH = "default";

/** Shared password for demo team members (hashed before persisting). */
export const DEMO_PASSWORD = "demo";
export const DEMO_PASSWORD_ROUNDS = 12;

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

export function hoursFromNow(n: number): Date {
  return new Date(Date.now() + n * 60 * 60 * 1000);
}

export function minutesAfter(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

/** Deterministic-enough fake 64-char hex digest for demo file/token rows. */
export function fakeHex(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let out = "";
  for (let i = 0; i < 64; i += 1) {
    h = (h * 1103515245 + 12345) >>> 0;
    out += (h & 0xf).toString(16);
  }
  return out;
}
