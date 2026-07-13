/**
 * LiveAktivitaeten — chronological system feed from real audit logs.
 *
 * No mocks. Pulls the most recent 25 audit entries, formats each line in
 * plain German, and links into the related entity when possible. Designed
 * to sit in the right column of the Leitstand next to "Heutige Prioritäten".
 */
import Link from "next/link";
import type { Route } from "next";

import type { AuditAction, AuditLogEntry } from "../../types";

interface Props {
  events: ReadonlyArray<AuditLogEntry>;
  /** id → name map for the actor column */
  actors: Record<string, string>;
}

const TIME_FMT = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

const RELATIVE = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });

function relTime(d: Date): string {
  const diffMs = d.getTime() - Date.now();
  const mins = Math.round(diffMs / 60_000);
  if (Math.abs(mins) < 60) return RELATIVE.format(mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return RELATIVE.format(hours, "hour");
  const days = Math.round(hours / 24);
  return RELATIVE.format(days, "day");
}

const ACTION_PHRASE: Record<AuditAction, { verb: string; tint: string; dot: string }> = {
  LEAD_CREATED: { verb: "Neuer Lead", tint: "text-emerald-300", dot: "bg-emerald-500" },
  LEAD_UPDATED: { verb: "Lead bearbeitet", tint: "text-blue-300", dot: "bg-blue-500" },
  LEAD_DELETED: { verb: "Lead gelöscht", tint: "text-red-300", dot: "bg-red-500" },
  LEAD_OPENED: { verb: "Lead geöffnet", tint: "text-zinc-300", dot: "bg-zinc-500" },
  LEAD_ASSIGNED: { verb: "Lead zugewiesen", tint: "text-blue-300", dot: "bg-blue-500" },
  LEAD_UNASSIGNED: { verb: "Zuweisung entfernt", tint: "text-zinc-300", dot: "bg-zinc-500" },
  STATUS_CHANGED: { verb: "Status geändert", tint: "text-violet-300", dot: "bg-violet-500" },
  STATUS_OVERRIDE: { verb: "Status überschrieben", tint: "text-amber-300", dot: "bg-amber-500" },
  SENSITIVE_REVEAL: { verb: "Sensible Daten eingesehen", tint: "text-red-300", dot: "bg-red-500" },
  LOGIN_SUCCESS: { verb: "Anmeldung", tint: "text-emerald-300", dot: "bg-emerald-500" },
  LOGIN_FAIL: { verb: "Anmeldung fehlgeschlagen", tint: "text-red-300", dot: "bg-red-500" },
  MAGIC_LINK_ISSUED: { verb: "Magic-Link versendet", tint: "text-blue-300", dot: "bg-blue-500" },
  MAGIC_LINK_CONSUMED: { verb: "Magic-Link verwendet", tint: "text-emerald-300", dot: "bg-emerald-500" },
  CONSENT_GRANT: { verb: "Einwilligung erteilt", tint: "text-emerald-300", dot: "bg-emerald-500" },
  CONSENT_REVOKE: { verb: "Einwilligung widerrufen", tint: "text-red-300", dot: "bg-red-500" },
  NOTE_ADDED: { verb: "Notiz", tint: "text-zinc-300", dot: "bg-zinc-500" },
  FOLLOW_UP_SCHEDULED: { verb: "Rückruf gesetzt", tint: "text-amber-300", dot: "bg-amber-500" },
  FILE_UPLOADED: { verb: "Datei hochgeladen", tint: "text-blue-300", dot: "bg-blue-500" },
  FILE_DOWNLOADED: { verb: "Datei heruntergeladen", tint: "text-zinc-300", dot: "bg-zinc-500" },
  FILE_DELETED: { verb: "Datei gelöscht", tint: "text-red-300", dot: "bg-red-500" },
  CONTACT_INQUIRY_CREATED: { verb: "Anfrage eingegangen", tint: "text-emerald-300", dot: "bg-emerald-500" },
  CONTACT_INQUIRY_UPDATED: { verb: "Anfrage bearbeitet", tint: "text-blue-300", dot: "bg-blue-500" },
  CONTACT_INQUIRY_DELETED: { verb: "Anfrage entfernt", tint: "text-red-300", dot: "bg-red-500" },
  AUTOMATION_SENT: { verb: "Automation versendet", tint: "text-emerald-300", dot: "bg-emerald-500" },
  AUTOMATION_FAILED: { verb: "Automation fehlgeschlagen", tint: "text-red-300", dot: "bg-red-500" },
  AUTOMATION_TEMPLATE_CREATED: { verb: "Vorlage erstellt", tint: "text-emerald-300", dot: "bg-emerald-500" },
  AUTOMATION_TEMPLATE_UPDATED: { verb: "Vorlage aktualisiert", tint: "text-violet-300", dot: "bg-violet-500" },
  AUTOMATION_TEMPLATE_DELETED: { verb: "Vorlage gelöscht", tint: "text-red-300", dot: "bg-red-500" },
  AUTOMATION_RULE_CREATED: { verb: "Automation erstellt", tint: "text-emerald-300", dot: "bg-emerald-500" },
  AUTOMATION_RULE_UPDATED: { verb: "Automation aktualisiert", tint: "text-violet-300", dot: "bg-violet-500" },
  AUTOMATION_RULE_DELETED: { verb: "Automation gelöscht", tint: "text-red-300", dot: "bg-red-500" },
  AUTOMATION_RULE_SIMULATED: { verb: "Automation simuliert", tint: "text-violet-300", dot: "bg-violet-500" },
  CALL_LOGGED: { verb: "Anruf dokumentiert", tint: "text-orange-300", dot: "bg-orange-500" },
  USER_CREATED: { verb: "Mitarbeiter angelegt", tint: "text-emerald-300", dot: "bg-emerald-500" },
  USER_UPDATED: { verb: "Mitarbeiter aktualisiert", tint: "text-zinc-300", dot: "bg-zinc-500" },
  USER_ROLE_CHANGED: { verb: "Rolle geändert", tint: "text-violet-300", dot: "bg-violet-500" },
  USER_DEACTIVATED: { verb: "Mitarbeiter deaktiviert", tint: "text-amber-300", dot: "bg-amber-500" },
  USER_REACTIVATED: { verb: "Mitarbeiter reaktiviert", tint: "text-emerald-300", dot: "bg-emerald-500" },
  USER_DELETED: { verb: "Mitarbeiter entfernt", tint: "text-red-300", dot: "bg-red-500" },
  TASK_CREATED: { verb: "Aufgabe angelegt", tint: "text-blue-300", dot: "bg-blue-500" },
  TASK_UPDATED: { verb: "Aufgabe aktualisiert", tint: "text-violet-300", dot: "bg-violet-500" },
  TASK_DELETED: { verb: "Aufgabe entfernt", tint: "text-red-300", dot: "bg-red-500" },
  DOCUMENT_REQUESTED: { verb: "Unterlagen angefordert", tint: "text-amber-300", dot: "bg-amber-500" },
  DOCUMENT_UPLOADED: { verb: "Dokument hochgeladen", tint: "text-blue-300", dot: "bg-blue-500" },
  DOCUMENT_APPROVED: { verb: "Dokument freigegeben", tint: "text-emerald-300", dot: "bg-emerald-500" },
  DOCUMENT_REJECTED: { verb: "Dokument abgelehnt", tint: "text-red-300", dot: "bg-red-500" },
  PORTAL_LINK_CREATED: { verb: "Portal-Link erstellt", tint: "text-blue-300", dot: "bg-blue-500" },
  PORTAL_LINK_UPDATED: { verb: "Portal-Link aktualisiert", tint: "text-violet-300", dot: "bg-violet-500" },
  PORTAL_OPENED: { verb: "Portal geöffnet", tint: "text-emerald-300", dot: "bg-emerald-500" },
  PORTAL_FORM_STARTED: { verb: "Formular begonnen", tint: "text-zinc-300", dot: "bg-zinc-500" },
  PORTAL_FORM_SAVED: { verb: "Formular gespeichert", tint: "text-zinc-300", dot: "bg-zinc-500" },
  PORTAL_FORM_SUBMITTED: { verb: "Formular abgeschickt", tint: "text-blue-300", dot: "bg-blue-500" },
  PORTAL_UPLOAD_ADDED: { verb: "Upload im Portal", tint: "text-blue-300", dot: "bg-blue-500" },
  PORTAL_DOCS_COMPLETE: { verb: "Unterlagen vollständig", tint: "text-emerald-300", dot: "bg-emerald-500" },
  MESSAGE_SENT: { verb: "Nachricht gesendet", tint: "text-blue-300", dot: "bg-blue-500" },
  MESSAGE_RECEIVED: { verb: "Antwort erhalten", tint: "text-emerald-300", dot: "bg-emerald-500" },
  MESSAGE_FAILED: { verb: "Nachricht fehlgeschlagen", tint: "text-red-300", dot: "bg-red-500" },
  WORKFLOW_AUTOMATION: { verb: "Automatische Aktion", tint: "text-emerald-300", dot: "bg-emerald-500" },
  WHATSAPP_OPT_OUT: { verb: "WhatsApp abgemeldet (Opt-out)", tint: "text-red-300", dot: "bg-red-500" },
  WHATSAPP_SEND_SKIPPED_OPT_OUT: { verb: "WhatsApp übersprungen (Opt-out)", tint: "text-zinc-300", dot: "bg-zinc-500" },
};

function entityHref(e: AuditLogEntry): Route | null {
  if (e.entityType === "Lead") return `/crm/leads/${e.entityId}` as Route;
  if (e.entityType === "ContactInquiry")
    return `/crm/inquiries/${e.entityId}` as Route;
  return null;
}

export function LiveAktivitaeten({ events, actors }: Props) {
  return (
    <section
      aria-labelledby="activity-heading"
      className="ops-card overflow-hidden"
    >
      <header className="flex items-end justify-between px-5 py-4">
        <div>
          <p className="ops-eyebrow">Live-Aktivitäten</p>
          <h2
            id="activity-heading"
            className="mt-1 text-[18px] font-bold tracking-tight text-white"
          >
            System-Puls
          </h2>
        </div>
        <Link
          href="/crm/activity"
          className="text-[11.5px] font-semibold text-zinc-400 transition hover:text-orange-300"
        >
          Alles ansehen →
        </Link>
      </header>
      <ul className="max-h-[520px] overflow-y-auto border-t border-white/[0.05] divide-y divide-white/[0.04]">
        {events.length === 0 && (
          <li className="px-5 py-8 text-center text-[13px] text-zinc-500">
            Noch keine Aktivität registriert.
          </li>
        )}
        {events.map((e) => {
          const meta = ACTION_PHRASE[e.action] ?? {
            verb: String(e.action),
            tint: "text-zinc-300",
            dot: "bg-zinc-500",
          };
          const actorName = actors[e.actor] ?? "System";
          const href = entityHref(e);
          const body = (
            <div className="flex gap-3 px-5 py-2.5">
              <span
                aria-hidden
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-snug">
                  <span className={`font-semibold ${meta.tint}`}>
                    {meta.verb}
                  </span>
                  {e.details ? (
                    <span className="text-zinc-300"> · {e.details}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[10.5px] text-zinc-500">
                  {actorName} · {relTime(e.createdAt)} ·{" "}
                  <span className="tabular-nums">
                    {TIME_FMT.format(e.createdAt)}
                  </span>
                </p>
              </div>
            </div>
          );
          return (
            <li key={e.id} className="transition hover:bg-white/[0.03]">
              {href ? (
                <Link href={href} className="block">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
