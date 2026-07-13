/**
 * Activity label/icon mapping shared by the Activity Feed page, the Lead
 * Workbench timeline and the Dashboard "Aktivitäten" tile.
 */
import { AuditAction } from "../../auditTypes";

export interface ActivityVisual {
  label: string;
  icon: string; // emoji-free pictogram identifier — components render an SVG
  tint:
    | "brand"
    | "accent"
    | "indigo"
    | "amber"
    | "rose"
    | "slate"
    | "violet"
    | "emerald";
}

export const ACTIVITY_LABEL: Record<AuditAction, ActivityVisual> = {
  LEAD_CREATED: { label: "Lead erstellt", icon: "user-plus", tint: "accent" },
  LEAD_UPDATED: { label: "Lead bearbeitet", icon: "edit", tint: "brand" },
  LEAD_DELETED: { label: "Lead gelöscht", icon: "trash", tint: "rose" },
  LEAD_OPENED: { label: "Lead geöffnet", icon: "eye", tint: "slate" },
  LEAD_ASSIGNED: { label: "Lead zugewiesen", icon: "users", tint: "brand" },
  LEAD_UNASSIGNED: { label: "Zuweisung entfernt", icon: "users", tint: "slate" },
  STATUS_CHANGED: { label: "Status geändert", icon: "flag", tint: "indigo" },
  STATUS_OVERRIDE: { label: "Status überschrieben", icon: "flag", tint: "amber" },
  SENSITIVE_REVEAL: { label: "Sensible Daten eingesehen", icon: "shield", tint: "rose" },
  LOGIN_SUCCESS: { label: "Anmeldung erfolgreich", icon: "key", tint: "emerald" },
  LOGIN_FAIL: { label: "Anmeldung fehlgeschlagen", icon: "key", tint: "rose" },
  MAGIC_LINK_ISSUED: { label: "Magic-Link versendet", icon: "link", tint: "brand" },
  MAGIC_LINK_CONSUMED: { label: "Magic-Link verwendet", icon: "link", tint: "accent" },
  CONSENT_GRANT: { label: "Einwilligung erteilt", icon: "check", tint: "accent" },
  CONSENT_REVOKE: { label: "Einwilligung widerrufen", icon: "x", tint: "rose" },
  NOTE_ADDED: { label: "Notiz hinzugefügt", icon: "note", tint: "slate" },
  FOLLOW_UP_SCHEDULED: { label: "Wiedervorlage gesetzt", icon: "clock", tint: "amber" },
  FILE_UPLOADED: { label: "Datei hochgeladen", icon: "upload", tint: "brand" },
  FILE_DOWNLOADED: { label: "Datei heruntergeladen", icon: "download", tint: "slate" },
  FILE_DELETED: { label: "Datei gelöscht", icon: "trash", tint: "rose" },
  CONTACT_INQUIRY_CREATED: { label: "Anfrage eingegangen", icon: "inbox", tint: "accent" },
  CONTACT_INQUIRY_UPDATED: { label: "Anfrage bearbeitet", icon: "inbox", tint: "indigo" },
  CONTACT_INQUIRY_DELETED: { label: "Anfrage entfernt", icon: "trash", tint: "rose" },
  AUTOMATION_SENT: { label: "Automation versendet", icon: "send", tint: "accent" },
  AUTOMATION_FAILED: { label: "Automation fehlgeschlagen", icon: "send", tint: "rose" },
  AUTOMATION_TEMPLATE_CREATED: { label: "Vorlage erstellt", icon: "spark", tint: "accent" },
  AUTOMATION_TEMPLATE_UPDATED: { label: "Vorlage aktualisiert", icon: "edit", tint: "indigo" },
  AUTOMATION_TEMPLATE_DELETED: { label: "Vorlage gelöscht", icon: "trash", tint: "rose" },
  AUTOMATION_RULE_CREATED: { label: "Automation erstellt", icon: "spark", tint: "accent" },
  AUTOMATION_RULE_UPDATED: { label: "Automation aktualisiert", icon: "edit", tint: "indigo" },
  AUTOMATION_RULE_DELETED: { label: "Automation gelöscht", icon: "trash", tint: "rose" },
  AUTOMATION_RULE_SIMULATED: { label: "Automation simuliert", icon: "spark", tint: "violet" },
  CALL_LOGGED: { label: "Anruf dokumentiert", icon: "phone", tint: "violet" },
  USER_CREATED: { label: "Mitarbeiter angelegt", icon: "user-plus", tint: "accent" },
  USER_UPDATED: { label: "Mitarbeiter aktualisiert", icon: "users", tint: "slate" },
  USER_ROLE_CHANGED: { label: "Rolle geändert", icon: "shield", tint: "indigo" },
  USER_DEACTIVATED: { label: "Mitarbeiter deaktiviert", icon: "user-x", tint: "amber" },
  USER_REACTIVATED: { label: "Mitarbeiter reaktiviert", icon: "user-check", tint: "accent" },
  USER_DELETED: { label: "Mitarbeiter entfernt", icon: "trash", tint: "rose" },
  TASK_CREATED: { label: "Aufgabe angelegt", icon: "check", tint: "brand" },
  TASK_UPDATED: { label: "Aufgabe aktualisiert", icon: "edit", tint: "indigo" },
  TASK_DELETED: { label: "Aufgabe gelöscht", icon: "trash", tint: "rose" },
  DOCUMENT_REQUESTED: { label: "Unterlagen angefordert", icon: "doc", tint: "amber" },
  DOCUMENT_UPLOADED: { label: "Dokument hochgeladen", icon: "upload", tint: "brand" },
  DOCUMENT_APPROVED: { label: "Dokument freigegeben", icon: "check", tint: "emerald" },
  DOCUMENT_REJECTED: { label: "Dokument abgelehnt", icon: "x", tint: "rose" },
  PORTAL_LINK_CREATED: { label: "Portal-Link erstellt", icon: "link", tint: "brand" },
  PORTAL_LINK_UPDATED: { label: "Portal-Link aktualisiert", icon: "link", tint: "indigo" },
  PORTAL_OPENED: { label: "Portal geöffnet", icon: "eye", tint: "accent" },
  PORTAL_FORM_STARTED: { label: "Formular begonnen", icon: "edit", tint: "slate" },
  PORTAL_FORM_SAVED: { label: "Formular gespeichert", icon: "note", tint: "slate" },
  PORTAL_FORM_SUBMITTED: { label: "Formular abgeschickt", icon: "send", tint: "accent" },
  PORTAL_UPLOAD_ADDED: { label: "Upload im Portal", icon: "upload", tint: "brand" },
  PORTAL_DOCS_COMPLETE: { label: "Unterlagen vollständig", icon: "check", tint: "emerald" },
  MESSAGE_SENT: { label: "Nachricht gesendet", icon: "send", tint: "brand" },
  MESSAGE_RECEIVED: { label: "Antwort erhalten", icon: "message", tint: "accent" },
  MESSAGE_FAILED: { label: "Nachricht fehlgeschlagen", icon: "send", tint: "rose" },
  WORKFLOW_AUTOMATION: { label: "Automatische Aktion", icon: "spark", tint: "indigo" },
  WHATSAPP_OPT_OUT: { label: "WhatsApp abgemeldet (Opt-out)", icon: "x", tint: "rose" },
  WHATSAPP_SEND_SKIPPED_OPT_OUT: { label: "WhatsApp übersprungen (Opt-out)", icon: "x", tint: "slate" },
};

const TINT_BG: Record<ActivityVisual["tint"], string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  accent: "bg-accent-50 text-accent-900 ring-accent-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function activityTintClasses(tint: ActivityVisual["tint"]): string {
  return TINT_BG[tint];
}
