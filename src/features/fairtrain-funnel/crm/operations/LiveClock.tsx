"use client";

import { useEffect, useState } from "react";

const TIME_FMT = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Tiny client-only clock — only the time digit re-renders, the rest of the
 * header stays a server tree. Updates every 30s; we render the SSR value
 * first to avoid hydration jumps.
 */
export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="hidden items-center gap-1.5 text-[11.5px] tabular-nums text-zinc-400 lg:inline-flex">
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
      {now ? TIME_FMT.format(now) : "--:--"}
    </span>
  );
}
