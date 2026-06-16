/**
 * Server-side template renderer for automation messages.
 * Replaces {{variable}} placeholders — unknown keys stay literal.
 */
import type {
  LeadDetail,
  TemplateRenderContext,
} from "../types";

const VARIABLE_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/gi;

export const TEMPLATE_VARIABLES: ReadonlyArray<{
  key: keyof TemplateRenderContext;
  label: string;
}> = [
  { key: "name", label: "Vollständiger Name" },
  { key: "email", label: "E-Mail" },
  { key: "telefon", label: "Telefon (DE)" },
  { key: "phone", label: "Telefon (EN alias)" },
  { key: "standort", label: "Standort (DE)" },
  { key: "location", label: "Standort (EN alias)" },
  { key: "interesse", label: "Interesse / Motivation" },
  { key: "interest", label: "Interesse (EN alias)" },
  { key: "nachricht", label: "Nachricht" },
  { key: "message", label: "Nachricht (EN alias)" },
  { key: "source_domain", label: "Quell-Domain" },
  { key: "datum", label: "Datum (de-DE)" },
];

const LOCATION_LABELS: Record<string, string> = {
  BERLIN: "Berlin",
  SAALFELD: "Saalfeld",
  UNDECIDED: "noch offen",
};

export function buildTemplateContext(
  lead: LeadDetail,
  sourceDomain: string,
): TemplateRenderContext {
  const name = `${lead.firstName} ${lead.lastName}`.trim();
  const standort = LOCATION_LABELS[lead.preferredLocation] ?? lead.preferredLocation;
  const interesse = lead.motivationText?.trim() || "Lokführer-Ausbildung";
  const datum = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return {
    name,
    email: lead.email,
    telefon: lead.phone,
    phone: lead.phone,
    standort,
    location: standort,
    interesse,
    interest: interesse,
    nachricht: interesse,
    message: interesse,
    source_domain: sourceDomain,
    datum,
  };
}

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
