/**
 * CRM route loading skeleton — the instant "sofort öffnen"-feedback.
 *
 * App-Router streaming: this Suspense fallback paints IMMEDIATELY on every
 * navigation into any /crm page (the sticky header + sidebar stay in place),
 * while the target page's server data loads and streams in. Purely visual — it
 * changes no data and no behaviour, it only removes the "click and wait on a
 * blank screen" feeling.
 *
 * A neutral, page-agnostic layout (title bar → stat cards → list) so it fits the
 * dashboard, leads, reactivation, multichat and every other surface equally.
 * Rendered inside the dark [data-ops] scope, so surfaces/shimmer use dark tones.
 * The /crm/login segment overrides this with its own (null) loading so the app
 * skeleton never flashes on the login screen.
 */
export default function CrmLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      {/* Title + actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-52 rounded-lg bg-white/[0.08]" />
          <div className="h-3.5 w-72 rounded bg-white/[0.05]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-white/[0.06]" />
          <div className="h-9 w-28 rounded-xl bg-white/[0.06]" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
          >
            <div className="h-7 w-16 rounded-lg bg-white/[0.08]" />
            <div className="mt-3 h-3 w-24 rounded bg-white/[0.05]" />
          </div>
        ))}
      </div>

      {/* Content panel with list rows */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
        <div className="border-b border-white/[0.06] px-5 py-3.5">
          <div className="h-4 w-40 rounded bg-white/[0.06]" />
        </div>
        <div className="divide-y divide-white/[0.06]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="h-9 w-9 shrink-0 rounded-full bg-white/[0.06]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-1/3 rounded bg-white/[0.06]" />
                <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
              </div>
              <div className="hidden h-6 w-20 rounded-full bg-white/[0.05] sm:block" />
              <div className="h-8 w-16 rounded-lg bg-white/[0.05]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
