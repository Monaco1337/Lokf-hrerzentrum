/**
 * Server-side template renderer for automation messages.
 * Replaces {{variable}} placeholders — unknown keys stay literal.
 */
import type {
  LeadDetail,
  TemplateRenderContext,
} from "../types";

const VARIABLE_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/gi;

/** Variables offered as insert-buttons in the template editor (spec list). */
export const TEMPLATE_VARIABLES: ReadonlyArray<{
  key: keyof TemplateRenderContext;
  label: string;
}> = [
  { key: "first_name", label: "Vorname" },
  { key: "last_name", label: "Nachname" },
  { key: "full_name", label: "Vollständiger Name" },
  { key: "phone", label: "Telefon" },
  { key: "email", label: "E-Mail" },
  { key: "city", label: "Stadt" },
  { key: "secure_form_link", label: "Sicherer Formular-Link" },
  { key: "upload_link", label: "Upload-Link" },
  { key: "booking_link", label: "Termin-Link" },
  { key: "missing_documents", label: "Fehlende Unterlagen" },
  { key: "owner_name", label: "Bearbeiter" },
  { key: "company_name", label: "Firmenname" },
  { key: "appointment_date", label: "Termin-Datum" },
  { key: "appointment_time", label: "Termin-Uhrzeit" },
];

const LOCATION_LABELS: Record<string, string> = {
  BERLIN: "Berlin",
  SAALFELD: "Saalfeld",
  UNDECIDED: "noch offen",
};

export interface TemplateContextOptions {
  ownerName?: string | null;
  missingDocuments?: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
}

export function buildTemplateContext(
  lead: LeadDetail,
  sourceDomain: string,
  opts: TemplateContextOptions = {},
): TemplateRenderContext {
  const fullName = `${lead.firstName} ${lead.lastName}`.trim();
  const standort = LOCATION_LABELS[lead.preferredLocation] ?? lead.preferredLocation;
  const interesse = lead.motivationText?.trim() || "Lokführer-Ausbildung";
  const datum = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const baseUrl = `https://${sourceDomain}`;

  return {
    first_name: lead.firstName,
    last_name: lead.lastName,
    full_name: fullName,
    name: fullName,
    phone: lead.phone,
    telefon: lead.phone,
    email: lead.email,
    city: lead.city ?? standort,
    standort,
    location: standort,
    secure_form_link: `${baseUrl}/m/formular`,
    upload_link: `${baseUrl}/m/upload`,
    booking_link: `${baseUrl}/m/termin`,
    missing_documents: opts.missingDocuments?.trim() || "die noch offenen Unterlagen",
    owner_name: opts.ownerName?.trim() || "Ihr Ansprechpartner",
    company_name: "Lokführerzentrum",
    appointment_date: opts.appointmentDate?.trim() || "—",
    appointment_time: opts.appointmentTime?.trim() || "—",
    interesse,
    interest: interesse,
    nachricht: interesse,
    message: interesse,
    source_domain: sourceDomain,
    datum,
  };
}

/** Extract {{variables}} referenced in a template body/subject. */
export function extractVariables(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(VARIABLE_PATTERN)) {
    if (m[1]) out.add(m[1].toLowerCase());
  }
  return [...out];
}

/** Known variable keys (for missing-variable validation in the editor). */
export const KNOWN_VARIABLE_KEYS: ReadonlyArray<string> = [
  "first_name", "last_name", "full_name", "name", "phone", "telefon",
  "email", "city", "standort", "location", "secure_form_link", "upload_link",
  "booking_link", "missing_documents", "owner_name", "company_name",
  "appointment_date", "appointment_time", "interesse", "interest",
  "nachricht", "message", "source_domain", "datum",
];

export function renderTemplate(
  template: string,
  context: TemplateRenderContext,
): string {
  return template.replace(VARIABLE_PATTERN, (_match, rawKey: string) => {
    const key = rawKey.toLowerCase() as keyof TemplateRenderContext;
    return context[key] ?? `{{${rawKey}}}`;
  });
}

export function renderEmailHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, "<br />"))
    .map((p) => `<p style="margin:0 0 1em;line-height:1.6">${p}</p>`)
    .join("");
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#0f172a">${paragraphs}</body></html>`;
}
