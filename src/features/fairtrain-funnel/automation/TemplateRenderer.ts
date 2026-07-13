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
  /** Lead-specific, token-secured upload link (falls back to a generic link). */
  uploadLink?: string | null;
  /** Lead-specific magic/portal link (defaults to uploadLink). */
  magicLink?: string | null;
  /** Reply-to / support address surfaced in transactional emails. */
  supportEmail?: string | null;
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
  // Prefer a lead-specific, token-secured link; never leak PII into the URL.
  const uploadLink = opts.uploadLink?.trim() || `${baseUrl}/m/upload`;
  const magicLink = opts.magicLink?.trim() || uploadLink;
  const supportEmail = opts.supportEmail?.trim() || `info@${sourceDomain}`;

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
    upload_link: uploadLink,
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
    // camelCase aliases used by the transactional lead templates.
    firstname: lead.firstName,
    lastname: lead.lastName,
    fullname: fullName,
    leadid: lead.id,
    uploadlink: uploadLink,
    magiclink: magicLink,
    supportemail: supportEmail,
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
  "firstname", "lastname", "fullname", "leadid", "uploadlink", "magiclink",
  "supportemail",
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

/* ------------------------------------------------------------------ *
 * Branded HTML email layout (Lokführerzentrum)                        *
 * ------------------------------------------------------------------ *
 * Table-based + inline CSS for maximum client compatibility           *
 * (Outlook, Gmail, Apple Mail, mobile). The template body arrives as  *
 * plain text; we turn it into styled paragraphs and render standalone *
 * links as branded call-to-action buttons.                            */

const EMAIL_ORIGIN = "https://www.xn--lokfhrerzentrum-2vb.de";
const EMAIL_LOGO_URL = `${EMAIL_ORIGIN}/brand/email-logo.jpg`;
const EMAIL_BRAND = {
  green: "#3F7248",
  greenDark: "#35613D",
  navy: "#0F1B3D",
  pageBg: "#eceff5",
  cardBg: "#ffffff",
  border: "#e2e8f0",
  text: "#1f2937",
  soft: "#475569",
  muted: "#94a3b8",
} as const;
const EMAIL_FONT =
  "'Segoe UI', Roboto, Helvetica, Arial, -apple-system, BlinkMacSystemFont, sans-serif";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const URL_RE = /https?:\/\/[^\s<]+/gi;

/** Human label for a standalone CTA link, inferred from the URL. */
function ctaLabel(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("/bewerbung") || u.includes("upload") || u.includes("/m/"))
    return "Unterlagen sicher hochladen";
  if (u.includes("termin") || u.includes("book") || u.includes("cal"))
    return "Termin auswählen";
  if (u.includes("eignung")) return "Eignungscheck starten";
  return "Jetzt öffnen";
}

function ctaButton(url: string): string {
  const href = escapeHtml(url);
  const label = ctaLabel(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px auto;"><tr><td align="center" bgcolor="${EMAIL_BRAND.green}" style="border-radius:12px;">
<a href="${href}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:${EMAIL_FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;background:${EMAIL_BRAND.green};">${label} &rarr;</a>
</td></tr></table>
<p style="margin:0 0 18px;font-family:${EMAIL_FONT};font-size:12px;line-height:1.6;color:${EMAIL_BRAND.muted};text-align:center;word-break:break-all;">Falls der Button nicht funktioniert: <a href="${href}" target="_blank" style="color:${EMAIL_BRAND.green};">${href}</a></p>`;
}

/** Escape text and turn inline URLs into branded links. */
function paragraphHtml(text: string): string {
  const withBreaks = escapeHtml(text).replace(/\n/g, "<br />");
  const linked = withBreaks.replace(
    URL_RE,
    (m) =>
      `<a href="${m}" target="_blank" style="color:${EMAIL_BRAND.green};font-weight:600;text-decoration:underline;">${m}</a>`,
  );
  return `<p style="margin:0 0 18px;font-family:${EMAIL_FONT};font-size:16px;line-height:1.7;color:${EMAIL_BRAND.text};">${linked}</p>`;
}

/** Render the plain-text body into styled blocks (paragraphs + CTA buttons). */
function renderEmailBody(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) =>
      /^https?:\/\/\S+$/i.test(block) ? ctaButton(block) : paragraphHtml(block),
    )
    .join("");
}

export function renderEmailHtml(
  body: string,
  opts: { preheader?: string } = {},
): string {
  const content = renderEmailBody(body);
  const preheaderSource =
    opts.preheader ??
    body.split(/\n/).map((l) => l.trim()).find((l) => l.length > 0) ??
    "Lokführerzentrum.de";
  const preheader = escapeHtml(preheaderSource.slice(0, 140));

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light" />
<title>Lokführerzentrum.de</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.pageBg};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${EMAIL_BRAND.pageBg};">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_BRAND.pageBg};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:${EMAIL_BRAND.cardBg};border:1px solid ${EMAIL_BRAND.border};border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,27,61,0.06);">
<tr><td style="height:6px;background:linear-gradient(90deg,${EMAIL_BRAND.green},${EMAIL_BRAND.navy});font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:34px 40px 8px;">
<img src="${EMAIL_LOGO_URL}" width="300" alt="Lokführerzentrum.de" style="display:block;width:300px;max-width:78%;height:auto;border:0;" />
</td></tr>
<tr><td style="padding:16px 44px 30px;">${content}</td></tr>
<tr><td style="background:${EMAIL_BRAND.navy};padding:26px 40px;">
<p style="margin:0 0 6px;font-family:${EMAIL_FONT};font-size:15px;font-weight:700;color:#ffffff;">Lokführerzentrum.de</p>
<p style="margin:0 0 12px;font-family:${EMAIL_FONT};font-size:12px;letter-spacing:0.5px;color:#9fb0c9;text-transform:uppercase;">Dein Einstieg. Deine Zukunft. Dein Weg.</p>
<p style="margin:0;font-family:${EMAIL_FONT};font-size:12px;line-height:1.7;color:#cbd5e1;">
<a href="mailto:foerderung@xn--lokfhrerzentrum-2vb.de" style="color:#cbd5e1;text-decoration:none;">foerderung@lokführerzentrum.de</a>&nbsp;&bull;&nbsp;<a href="${EMAIL_ORIGIN}" target="_blank" style="color:#cbd5e1;text-decoration:none;">www.lokführerzentrum.de</a>
</p>
<p style="margin:12px 0 0;font-family:${EMAIL_FONT};font-size:11px;line-height:1.6;color:#6b7c98;">Diese E-Mail bezieht sich auf deine Anfrage zur geförderten Lokführer-Weiterbildung. Deine Daten werden ausschließlich hierfür und DSGVO-konform verarbeitet.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
