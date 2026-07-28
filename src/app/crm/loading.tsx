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
 * The /crm/login segment overrides this with its own (null) loading so the app
 * skeleton never flashes on the login screen.
 */
export default function CrmLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      {/* Title + actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-52 rounded-lg bg-slate-200/80" />
          <div className="h-3.5 w-72 rounded bg-slate-200/60" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-slate-200/70" />
          <div className="h-9 w-28 rounded-xl bg-slate-200/70" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-black/[0.05] bg-white/70 p-4 shadow-sm"
          >
            <div className="h-7 w-16 rounded-lg bg-slate-200/80" />
            <div className="mt-3 h-3 w-24 rounded bg-slate-200/60" />
          </div>
        ))}
      </div>

      {/* Content panel with list rows */}
      <div className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white/70 shadow-sm">
        <div className="border-b border-black/[0.05] px-5 py-3.5">
          <div className="h-4 w-40 rounded bg-slate-200/70" />
        </div>
        <div className="divide-y divide-black/[0.04]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200/70" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-1/3 rounded bg-slate-200/70" />
                <div className="h-3 w-1/2 rounded bg-slate-200/50" />
              </div>
              <div className="hidden h-6 w-20 rounded-full bg-slate-200/60 sm:block" />
              <div className="h-8 w-16 rounded-lg bg-slate-200/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
