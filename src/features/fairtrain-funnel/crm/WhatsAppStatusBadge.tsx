/**
 * WhatsAppStatusBadge — the "High-End" per-lead WhatsApp state indicator.
 *
 * Renders the check-mark semantics operators expect from WhatsApp itself:
 *   · one grey check  → gesendet
 *   · two grey checks  → zugestellt
 *   · two blue checks  → gelesen
 *   · reply badge      → beantwortet
 *   · red warning      → fehlgeschlagen
 *   · grey ban symbol  → Nummer ungültig / nicht registriert / blockiert
 *
 * Every state shown here is driven by REAL provider webhook events; nothing is
 * simulated. The pill is purely presentational — it reads the tracking fields
 * already resolved on the LeadSummary.
 */
import {
  type LeadQualityStatus,
  type WhatsappTrackingStatus,
  WHATSAPP_TRACKING_LABEL,
} from "../messaging/types";

export interface WhatsAppTrackingView {
  whatsappStatus: WhatsappTrackingStatus;
  leadQualityStatus: LeadQualityStatus;
  leadScore: number;
  lastWhatsappMessageAt: Date | null;
  lastWhatsappDeliveredAt: Date | null;
  lastWhatsappReadAt: Date | null;
  lastWhatsappReplyAt: Date | null;
  lastWhatsappErrorAt: Date | null;
  lastWhatsappErrorReason: string | null;
}

type Glyph = "sent" | "delivered" | "read" | "reply" | "warn" | "ban" | "clock" | "dash";

const CONFIG: Record<
  WhatsappTrackingStatus,
  { glyph: Glyph; pill: string; iconClass: string }
> = {
  offen: { glyph: "dash", pill: "bg-slate-50 text-slate-500 ring-slate-200", iconClass: "text-slate-400" },
  geplant: { glyph: "clock", pill: "bg-slate-50 text-slate-600 ring-slate-200", iconClass: "text-slate-500" },
  gesendet: { glyph: "sent", pill: "bg-slate-50 text-slate-600 ring-slate-200", iconClass: "text-slate-500" },
  zugestellt: { glyph: "delivered", pill: "bg-slate-50 text-slate-700 ring-slate-200", iconClass: "text-slate-500" },
  gelesen: { glyph: "read", pill: "bg-sky-50 text-sky-700 ring-sky-200", iconClass: "text-sky-500" },
  beantwortet: { glyph: "reply", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", iconClass: "text-emerald-600" },
  fehlgeschlagen: { glyph: "warn", pill: "bg-red-50 text-red-700 ring-red-200", iconClass: "text-red-500" },
  nummer_ungueltig: { glyph: "ban", pill: "bg-slate-100 text-slate-600 ring-slate-300", iconClass: "text-slate-500" },
  nicht_registriert: { glyph: "ban", pill: "bg-slate-100 text-slate-600 ring-slate-300", iconClass: "text-slate-500" },
  blockiert: { glyph: "ban", pill: "bg-rose-50 text-rose-700 ring-rose-200", iconClass: "text-rose-500" },
  nicht_erreichbar: { glyph: "warn", pill: "bg-amber-50 text-amber-800 ring-amber-200", iconClass: "text-amber-500" },
};

const REL = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });
function relTime(at: Date | null): string {
  if (!at) return "";
  const min = Math.round((at.getTime() - Date.now()) / 60_000);
  if (Math.abs(min) < 60) return REL.format(min, "minute");
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return REL.format(h, "hour");
  return REL.format(Math.round(h / 24), "day");
}

/** The timestamp that best represents the current status. */
function statusAt(v: WhatsAppTrackingView): Date | null {
  switch (v.whatsappStatus) {
    case "beantwortet":
      return v.lastWhatsappReplyAt;
    case "gelesen":
      return v.lastWhatsappReadAt;
    case "zugestellt":
      return v.lastWhatsappDeliveredAt;
    case "fehlgeschlagen":
    case "nummer_ungueltig":
    case "nicht_registriert":
    case "blockiert":
    case "nicht_erreichbar":
      return v.lastWhatsappErrorAt;
    default:
      return v.lastWhatsappMessageAt;
  }
}

function Icon({ glyph, className }: { glyph: Glyph; className: string }) {
  const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none" } as const;
  switch (glyph) {
    case "sent":
      return (
        <svg {...common} className={className} aria-hidden>
          <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "delivered":
    case "read":
      return (
        <svg {...common} className={className} aria-hidden>
          <path d="M1 12.5l5 5L16 6.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 12.5l5 5L23 6.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "reply":
      return (
        <svg {...common} className={className} aria-hidden>
          <path d="M9 7L4 12l5 5M4 12h10a6 6 0 016 6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "warn":
      return (
        <svg {...common} className={className} aria-hidden>
          <path d="M12 3l9 16H3l9-16z" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
          <path d="M12 9v4M12 16.5v.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
        </svg>
      );
    case "ban":
      return (
        <svg {...common} className={className} aria-hidden>
          <circle cx={12} cy={12} r={8.5} stroke="currentColor" strokeWidth={2} />
          <path d="M6 6l12 12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common} className={className} aria-hidden>
          <circle cx={12} cy={12} r={8.5} stroke="currentColor" strokeWidth={2} />
          <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common} className={className} aria-hidden>
          <path d="M6 12h12" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
        </svg>
      );
  }
}

export function WhatsAppStatusBadge({
  view,
  withTime = false,
}: {
  view: WhatsAppTrackingView;
  withTime?: boolean;
}) {
  const cfg = CONFIG[view.whatsappStatus] ?? CONFIG.offen;
  const label = WHATSAPP_TRACKING_LABEL[view.whatsappStatus];
  const at = statusAt(view);
  const title = view.lastWhatsappErrorReason
    ? `WhatsApp: ${label} — ${view.lastWhatsappErrorReason}`
    : `WhatsApp: ${label}${at ? ` (${relTime(at)})` : ""}`;

  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset",
        cfg.pill,
      ].join(" ")}
    >
      <Icon glyph={cfg.glyph} className={cfg.iconClass} />
      <span>{label}</span>
      {withTime && at ? (
        <span className="font-normal opacity-70">· {relTime(at)}</span>
      ) : null}
    </span>
  );
}
