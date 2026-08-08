/**
 * Rückruf-Center — applicants who asked to be called back (WhatsApp callback
 * intent). Scoped to the real application process. Each row exposes the three
 * actions an operator needs: call, open lead, open WhatsApp — two clicks max to
 * the working view. Styled with the remap-proof `.dash-*` layer (tone: amber).
 */
import Link from "next/link";
import type { Route } from "next";

import type { CallbackLead } from "./DashboardLoader";

function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function waLink(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+")
    ? digits.slice(1)
    : digits.startsWith("0")
      ? `49${digits.slice(1)}`
      : digits;
  return `https://wa.me/${e164}`;
}

function relTime(date: Date | null): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return `vor ${d} T.`;
}

export function DashboardCallbacks({
  leads,
}: {
  leads: ReadonlyArray<CallbackLead>;
}) {
  return (
    <section id="rueckruf-center" className="dash-card dash-t-amber scroll-mt-6 p-4 sm:p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="dash-tile dash-tile--sm" aria-hidden>
            <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.71A2 2 0 0 1 22 16.92Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-[16px] font-bold tracking-tight text-white">
              Rückruf-Center
            </h2>
            <p className="mt-0.5 text-[11.5px] text-[#7f8a83]">
              Bewerber, die einen Rückruf wünschen
            </p>
          </div>
        </div>
        <span className={leads.length > 0 ? "dash-chip" : "dash-chip dash-chip--muted"}>
          {leads.length}
        </span>
      </header>

      {leads.length === 0 ? (
        <p className="mt-4 rounded-xl bg-white/[0.02] px-3 py-10 text-center text-[13px] text-[#7f8a83]">
          Aktuell keine offenen Rückrufe.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {leads.map((lead) => (
            <li key={lead.id} className="dash-row p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#e9efeb]">
                    {lead.name}
                  </p>
                  <a
                    href={telLink(lead.phone)}
                    className="text-[12px] font-medium tabular-nums text-amber-300 hover:underline"
                  >
                    {lead.phone}
                  </a>
                </div>
                <span className="shrink-0 text-[10.5px] text-[#7f8a83]">
                  {relTime(lead.lastMessageAt)}
                </span>
              </div>
              {lead.lastMessage ? (
                <p className="mt-2 line-clamp-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[12px] italic text-[#aab4ae] ring-1 ring-white/[0.05]">
                  „{lead.lastMessage}“
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={telLink(lead.phone)}
                  className="dash-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.71A2 2 0 0 1 22 16.92Z" />
                  </svg>
                  Anrufen
                </a>
                <Link
                  href={`/crm/leads/${lead.id}` as Route}
                  className="dash-btn-ghost inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition"
                >
                  Lead
                </Link>
                <a
                  href={waLink(lead.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dash-btn-wa inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.7-.3-3.9-.8L3 21l1.6-4.5C3.6 15.2 3 13.7 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
                  </svg>
                  WhatsApp
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
