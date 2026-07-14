/**
 * ActivityTimeline — chronological, mixed activity feed for a lead.
 *
 * Merges three event streams:
 *   - audit log entries (status changes, assignments, notes, calls, …)
 *   - call log entries
 *   - status history transitions
 *
 * Each event renders as a row with an icon, an actor, a description and a
 * relative timestamp. The same shape is reused for the dashboard
 * "Aktivitäten" feed.
 */
import {
  type AuditAction,
  type AuditLogEntry,
  type CallLogEntry,
  type StatusHistoryEntry,
} from "../../types";

export interface TimelineEvent {
  id: string;
  kind: "audit" | "call" | "status";
  label: string;
  detail?: string | null;
  actor: string;
  at: Date;
  tone: "neutral" | "info" | "positive" | "warning" | "danger" | "magic";
}

const TONE_DOT: Record<TimelineEvent["tone"], string> = {
  neutral: "bg-slate-300",
  info: "bg-sky-400",
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  magic: "bg-accent-600",
};

const ACTION_LABEL: Record<AuditAction, { label: string; tone: TimelineEvent["tone"] }> = {
  LEAD_CREATED: { label: "Lead angelegt", tone: "info" },
  LEAD_UPDATED: { label: "Lead bearbeitet", tone: "info" },
  LEAD_DELETED: { label: "Lead gelöscht", tone: "danger" },
  LEAD_OPENED: { label: "Lead geöffnet", tone: "neutral" },
  LEAD_ASSIGNED: { label: "Lead zugewiesen", tone: "magic" },
  LEAD_UNASSIGNED: { label: "Zuweisung entfernt", tone: "warning" },
  SENSITIVE_REVEAL: { label: "Sensible Angaben eingesehen", tone: "warning" },
  STATUS_OVERRIDE: { label: "Status manuell überschrieben", tone: "warning" },
  STATUS_CHANGED: { label: "Status geändert", tone: "info" },
  LOGIN_SUCCESS: { label: "Anmeldung erfolgreich", tone: "neutral" },
  LOGIN_FAIL: { label: "Anmeldung fehlgeschlagen", tone: "danger" },
  MAGIC_LINK_ISSUED: { label: "Magic-Link verschickt", tone: "magic" },
  MAGIC_LINK_CONSUMED: { label: "Magic-Link genutzt", tone: "positive" },
  CONSENT_GRANT: { label: "Einwilligung erteilt", tone: "positive" },
  CONSENT_REVOKE: { label: "Einwilligung widerrufen", tone: "warning" },
  NOTE_ADDED: { label: "Notiz hinzugefügt", tone: "info" },
  FOLLOW_UP_SCHEDULED: { label: "Rückruf geplant", tone: "magic" },
  FILE_UPLOADED: { label: "Datei hochgeladen", tone: "info" },
  FILE_DOWNLOADED: { label: "Datei heruntergeladen", tone: "neutral" },
  FILE_DELETED: { label: "Datei entfernt", tone: "warning" },
  CONTACT_INQUIRY_CREATED: { label: "Anfrage eingegangen", tone: "info" },
  CONTACT_INQUIRY_UPDATED: { label: "Anfrage aktualisiert", tone: "neutral" },
  CONTACT_INQUIRY_DELETED: { label: "Anfrage gelöscht", tone: "warning" },
  AUTOMATION_SENT: { label: "Automation versendet", tone: "positive" },
  AUTOMATION_FAILED: { label: "Automation fehlgeschlagen", tone: "danger" },
  AUTOMATION_TEMPLATE_CREATED: { label: "Vorlage erstellt", tone: "positive" },
  AUTOMATION_TEMPLATE_UPDATED: { label: "Vorlage aktualisiert", tone: "neutral" },
  AUTOMATION_TEMPLATE_DELETED: { label: "Vorlage gelöscht", tone: "warning" },
  AUTOMATION_RULE_CREATED: { label: "Automation erstellt", tone: "positive" },
  AUTOMATION_RULE_UPDATED: { label: "Automation aktualisiert", tone: "neutral" },
  AUTOMATION_RULE_DELETED: { label: "Automation gelöscht", tone: "warning" },
  AUTOMATION_RULE_SIMULATED: { label: "Automation simuliert", tone: "magic" },
  CALL_LOGGED: { label: "Anruf dokumentiert", tone: "info" },
  USER_CREATED: { label: "Nutzer angelegt", tone: "magic" },
  USER_UPDATED: { label: "Nutzer aktualisiert", tone: "neutral" },
  USER_ROLE_CHANGED: { label: "Rolle geändert", tone: "warning" },
  USER_DEACTIVATED: { label: "Nutzer deaktiviert", tone: "warning" },
  USER_REACTIVATED: { label: "Nutzer reaktiviert", tone: "positive" },
  USER_DELETED: { label: "Nutzer gelöscht", tone: "danger" },
  TASK_CREATED: { label: "Aufgabe angelegt", tone: "info" },
  TASK_UPDATED: { label: "Aufgabe aktualisiert", tone: "neutral" },
  TASK_DELETED: { label: "Aufgabe gelöscht", tone: "warning" },
  DOCUMENT_REQUESTED: { label: "Unterlagen angefordert", tone: "warning" },
  DOCUMENT_UPLOADED: { label: "Dokument hochgeladen", tone: "info" },
  DOCUMENT_VIEWED: { label: "Dokument gesichtet", tone: "neutral" },
  DOCUMENT_APPROVED: { label: "Dokument freigegeben", tone: "positive" },
  DOCUMENT_REJECTED: { label: "Dokument abgelehnt", tone: "danger" },
  PORTAL_LINK_CREATED: { label: "Portal-Link erstellt", tone: "info" },
  PORTAL_LINK_UPDATED: { label: "Portal-Link aktualisiert", tone: "neutral" },
  PORTAL_OPENED: { label: "Portal geöffnet", tone: "info" },
  PORTAL_FORM_STARTED: { label: "Formular begonnen", tone: "neutral" },
  PORTAL_FORM_SAVED: { label: "Formular gespeichert", tone: "neutral" },
  PORTAL_FORM_SUBMITTED: { label: "Formular abgeschickt", tone: "info" },
  PORTAL_UPLOAD_ADDED: { label: "Upload im Portal", tone: "info" },
  PORTAL_DOCS_COMPLETE: { label: "Unterlagen vollständig", tone: "positive" },
  MESSAGE_SENT: { label: "Nachricht gesendet", tone: "info" },
  MESSAGE_RECEIVED: { label: "Antwort erhalten", tone: "positive" },
  MESSAGE_FAILED: { label: "Nachricht fehlgeschlagen", tone: "danger" },
  WORKFLOW_AUTOMATION: { label: "Automatische Aktion", tone: "info" },
  WHATSAPP_OPT_OUT: { label: "WhatsApp abgemeldet (Opt-out)", tone: "danger" },
  WHATSAPP_SEND_SKIPPED_OPT_OUT: { label: "WhatsApp übersprungen (Opt-out)", tone: "neutral" },
  WHATSAPP_REPLY_CLASSIFIED: { label: "Antwort klassifiziert", tone: "positive" },
  WHATSAPP_REPLIES_BACKFILL: { label: "Antworten nachverarbeitet", tone: "magic" },
  LEAD_CONTACT_PROTECTED: { label: "Kontaktschutz gesetzt", tone: "warning" },
  SEND_SKIPPED_CONTACT_PROTECTED: { label: "Versand übersprungen (Kontaktschutz)", tone: "neutral" },
};

function relative(d: Date, now = Date.now()): string {
  const diff = now - d.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `vor ${Math.max(1, minutes)} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  if (days < 30) return `vor ${days} Tagen`;
  return d.toLocaleDateString("de-DE");
}

function fromAudit(entry: AuditLogEntry): TimelineEvent {
  const meta = ACTION_LABEL[entry.action] ?? {
    label: entry.action,
    tone: "neutral" as const,
  };
  return {
    id: `a:${entry.id}`,
    kind: "audit",
    label: meta.label,
    detail: entry.details,
    actor: entry.actor,
    at: entry.createdAt,
    tone: meta.tone,
  };
}

function fromCall(entry: CallLogEntry): TimelineEvent {
  return {
    id: `c:${entry.id}`,
    kind: "call",
    label: "Anruf dokumentiert",
    detail: entry.note ?? entry.nextStep ?? null,
    actor: entry.user.name,
    at: entry.createdAt,
    tone: "info",
  };
}

function fromStatus(entry: StatusHistoryEntry): TimelineEvent {
  return {
    id: `s:${entry.id}`,
    kind: "status",
    label: `Status → ${entry.toStatus}`,
    detail: entry.reason,
    actor: entry.changedBy,
    at: entry.createdAt,
    tone: "info",
  };
}

export function buildTimeline(input: {
  audit: ReadonlyArray<AuditLogEntry>;
  calls: ReadonlyArray<CallLogEntry>;
  statusHistory: ReadonlyArray<StatusHistoryEntry>;
}): TimelineEvent[] {
  const events = [
    ...input.audit.map(fromAudit),
    ...input.calls.map(fromCall),
    ...input.statusHistory.map(fromStatus),
  ];
  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  return events;
}

export function ActivityTimeline({
  events,
  emptyMessage = "Noch keine Aktivität.",
}: {
  events: ReadonlyArray<TimelineEvent>;
  emptyMessage?: string;
}) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink/15 bg-surface-subtle/40 px-3 py-4 text-center text-[12px] text-ink-muted">
        {emptyMessage}
      </p>
    );
  }
  return (
    <ol className="relative space-y-0">
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-ink/10"
      />
      {events.map((e) => (
        <li key={e.id} className="relative flex gap-3 py-2.5 pl-6 pr-1">
          <span
            aria-hidden
            className={`absolute left-0 top-3.5 h-3.5 w-3.5 rounded-full ring-2 ring-white ${TONE_DOT[e.tone]}`}
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline gap-2 text-[12.5px]">
              <span className="font-semibold text-navy-950">{e.label}</span>
              <span className="text-ink-muted">·</span>
              <span className="text-ink-soft">{e.actor}</span>
              <span className="ml-auto text-[11px] text-ink-muted">
                {relative(e.at)}
              </span>
            </div>
            {e.detail ? (
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {e.detail.length > 200 ? `${e.detail.slice(0, 200)}…` : e.detail}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
