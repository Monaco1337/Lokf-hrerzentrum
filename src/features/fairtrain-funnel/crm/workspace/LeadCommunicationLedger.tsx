/**
 * LeadCommunicationLedger — unified, read-only conversation ledger for the
 * Kommunikation tab. Merges outbound/inbound CommunicationEvents, automation
 * sends and call logs into one chronological stream. Display-only; sending /
 * logging happens through the existing panels rendered alongside it.
 */
import type { AutomationLogEntry } from "../../automation/types";
import type { CallLogEntry, CommunicationEntry, MessageStatusT } from "../../types";
import { MESSAGE_SENT_BY_LABEL, MESSAGE_STATUS_LABEL } from "../../types";

interface LedgerItem {
  id: string;
  at: Date;
  channel: string;
  direction: "inbound" | "outbound" | "internal";
  title: string;
  body: string;
  status: string;
  statusTone: "ok" | "warn" | "fail" | "muted";
  sentBy: string;
  demo: boolean | null;
}

const CHANNEL_LABEL: Record<string, string> = {
  EMAIL: "E-Mail",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  PHONE: "Telefon",
  INTERNAL: "Intern",
};

function messageStatusTone(status: MessageStatusT): LedgerItem["statusTone"] {
  if (status === "READ" || status === "DELIVERED") return "ok";
  if (status === "FAILED") return "fail";
  if (status === "SENT" || status === "QUEUED") return "warn";
  return "muted";
}

const DT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function autoStatusTone(s: string): LedgerItem["statusTone"] {
  if (s === "SENT") return "ok";
  if (s === "FAILED") return "fail";
  if (s === "SKIPPED") return "muted";
  return "warn";
}

export function LeadCommunicationLedger({
  communications,
  automationLogs,
  callLogs,
}: {
  communications: ReadonlyArray<CommunicationEntry>;
  automationLogs: ReadonlyArray<AutomationLogEntry>;
  callLogs: ReadonlyArray<CallLogEntry>;
}) {
  const items: LedgerItem[] = [];

  for (const c of communications) {
    const sentByLabel = MESSAGE_SENT_BY_LABEL[c.sentBy] ?? "System";
    const title =
      c.direction === "IN"
        ? "Eingehende Nachricht"
        : c.templateName
          ? `Vorlage: ${c.templateName}`
          : "Ausgehende Nachricht";
    items.push({
      id: `comm-${c.id}`,
      at: c.createdAt,
      channel: CHANNEL_LABEL[c.channel] ?? c.channel,
      direction: c.direction === "IN" ? "inbound" : "outbound",
      title,
      body: c.failedReason ? `${c.payload} · ${c.failedReason}` : c.payload,
      status: MESSAGE_STATUS_LABEL[c.status],
      statusTone: messageStatusTone(c.status),
      sentBy: sentByLabel,
      demo: c.isDemo,
    });
  }

  // Automation SENT/FAILED sends now persist as full ledger messages above, so
  // only surface skipped automation attempts here (no consent / no provider).
  for (const a of automationLogs) {
    if (!a.status.startsWith("SKIPPED")) continue;
    items.push({
      id: `auto-${a.id}`,
      at: a.createdAt,
      channel: CHANNEL_LABEL[a.channel] ?? a.channel,
      direction: "outbound",
      title: a.templateSlug
        ? `Übersprungen: ${a.templateSlug}`
        : "Versand übersprungen",
      body: a.renderedSubject ? `${a.renderedSubject} — ${a.renderedBody}` : a.renderedBody,
      status: a.status.toLowerCase(),
      statusTone: autoStatusTone(a.status),
      sentBy: "Automation",
      demo: null,
    });
  }

  for (const call of callLogs) {
    items.push({
      id: `call-${call.id}`,
      at: call.createdAt,
      channel: "Telefon",
      direction: "internal",
      title: `Anruf · ${call.outcome}`,
      body: call.note ?? call.nextStep ?? "—",
      status: "protokolliert",
      statusTone: "muted",
      sentBy: call.user.name,
      demo: null,
    });
  }

  items.sort((a, b) => b.at.getTime() - a.at.getTime());

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-muted">
        Noch keine Kommunikation protokolliert.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((it) => (
        <li
          key={it.id}
          className="rounded-xl border border-ink/[0.07] bg-white px-3.5 py-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <DirectionGlyph direction={it.direction} />
              <span className="text-[12.5px] font-semibold text-ink">{it.title}</span>
              <span className="rounded-md bg-surface-subtle px-1.5 py-0.5 text-[10.5px] font-medium text-ink-soft">
                {it.channel}
              </span>
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-ink-muted">{DT.format(it.at)}</span>
          </div>
          {it.body ? (
            <p className="mt-1 line-clamp-2 text-[12px] text-ink-soft">{it.body}</p>
          ) : null}
          <div className="mt-1.5 flex items-center gap-2 text-[10.5px]">
            <StatusBadge tone={it.statusTone} label={it.status} />
            {it.demo !== null && (
              <span
                className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold ${
                  it.demo
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {it.demo ? "Demo" : "Echt"}
              </span>
            )}
            <span className="text-ink-muted">· {it.sentBy}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function DirectionGlyph({ direction }: { direction: LedgerItem["direction"] }) {
  const map = {
    inbound: { cls: "bg-blue-50 text-blue-600", char: "↓" },
    outbound: { cls: "bg-emerald-50 text-emerald-600", char: "↑" },
    internal: { cls: "bg-slate-100 text-slate-600", char: "•" },
  } as const;
  const m = map[direction];
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[12px] font-bold ${m.cls}`}>
      {m.char}
    </span>
  );
}

function StatusBadge({ tone, label }: { tone: LedgerItem["statusTone"]; label: string }) {
  const map = {
    ok: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    fail: "bg-red-50 text-red-700",
    muted: "bg-slate-100 text-slate-600",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold capitalize ${map[tone]}`}>
      {label}
    </span>
  );
}
