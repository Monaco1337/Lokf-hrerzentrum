/**
 * Premium lead detail header: identity, status at a glance and one-tap
 * contact actions (call · mail · WhatsApp). Plain German throughout.
 */
import type { LeadDetail as LeadDetailT } from "../types";
import { SlaCell } from "./SlaCell";
import { PriorityPill, StatusPill } from "./StatusPill";

function waLink(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+")
    ? digits.slice(1)
    : digits.startsWith("0")
      ? `49${digits.slice(1)}`
      : digits;
  return `https://wa.me/${e164}`;
}

export function LeadHeader({ lead }: { lead: LeadDetailT }) {
  const initials = `${lead.firstName[0] ?? ""}${lead.lastName[0] ?? ""}`.toUpperCase();
  return (
    <header className="overflow-hidden rounded-2xl bg-white shadow-premium ring-1 ring-ink/[0.04]">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white via-white to-surface-subtle font-display text-[18px] font-bold tracking-tight text-navy-950 ring-1 ring-inset ring-ink/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_-2px_rgba(15,23,42,0.1)]"
          >
            {initials || "?"}
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-navy-950">
              {lead.firstName} {lead.lastName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StatusPill status={lead.status} />
              <PriorityPill priority={lead.priority} />
              <SlaCell lead={lead} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ContactButton
            href={`tel:${lead.phone}`}
            label="Anrufen"
            icon={
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
            }
          />
          <ContactButton
            href={`mailto:${lead.email}`}
            label="E-Mail"
            icon={
              <>
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </>
            }
          />
          <ContactButton
            href={waLink(lead.phone)}
            label="WhatsApp"
            external
            tone="whatsapp"
            icon={
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-ink/[0.06] bg-surface-subtle/60 px-5 py-3 text-sm text-ink-soft md:px-6">
        <span>{lead.email}</span>
        <span className="text-ink-muted">·</span>
        <span>{lead.phone}</span>
      </div>
    </header>
  );
}

function ContactButton({
  href,
  label,
  icon,
  external,
  tone = "neutral",
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
  tone?: "neutral" | "whatsapp";
}) {
  const cls =
    tone === "whatsapp"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      : "border-ink/10 bg-white text-ink hover:border-ink/20 hover:bg-surface-subtle";
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={[
        "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5",
        cls,
      ].join(" ")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        {icon}
      </svg>
      {label}
    </a>
  );
}
