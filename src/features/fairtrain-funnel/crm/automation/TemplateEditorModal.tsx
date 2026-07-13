"use client";
/**
 * Create/edit a message template with variable insertion, live preview against a
 * selected demo lead, missing-variable detection, char count and channel hints.
 */
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createAutomationTemplate,
  deleteAutomationTemplate,
  updateAutomationTemplate,
} from "@/server/actions/automation";
import {
  TEMPLATE_CATEGORY_LABEL,
  META_BUTTON_TYPE_LABEL,
  type AutomationTemplateEntry,
  type MetaTemplateButton,
  type MetaTemplateButtonType,
} from "../../types";
import {
  KNOWN_VARIABLE_KEYS,
  TEMPLATE_VARIABLES,
  extractVariables,
} from "../../automation/TemplateRenderer";
import { Modal } from "../ui/Modal";

export interface PreviewLead {
  id: string;
  label: string;
  ctx: Record<string, string>;
}

/** Active WhatsApp sender numbers offered in the "Senden über" field. */
export interface WhatsAppSenderOption {
  phoneNumberId: string;
  label: string;
  displayPhone: string;
}

interface Props {
  open: boolean;
  mode: "create" | "edit";
  template?: AutomationTemplateEntry | undefined;
  previewLeads: ReadonlyArray<PreviewLead>;
  whatsappNumbers: ReadonlyArray<WhatsAppSenderOption>;
  onClose: () => void;
}

type Channel = "WHATSAPP" | "EMAIL" | "INTERNAL";
const CATEGORIES = Object.keys(TEMPLATE_CATEGORY_LABEL) as Array<
  keyof typeof TEMPLATE_CATEGORY_LABEL
>;

function renderPreview(text: string, ctx: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, k: string) => {
    const key = k.toLowerCase();
    return ctx[key] ?? `{{${k}}}`;
  });
}

/** Normalise buttons before saving: require a label, keep only relevant fields. */
function cleanButtons(buttons: MetaTemplateButton[]): MetaTemplateButton[] {
  const out: MetaTemplateButton[] = [];
  for (const b of buttons) {
    const text = b.text.trim();
    if (!text) continue;
    if (b.type === "url") {
      const url = (b.url ?? "").trim();
      if (!url) continue;
      out.push({ type: "url", text, url });
    } else if (b.type === "phone_number") {
      const phoneNumber = (b.phoneNumber ?? "").trim();
      if (!phoneNumber) continue;
      out.push({ type: "phone_number", text, phoneNumber });
    } else {
      const payload = (b.payload ?? "").trim();
      out.push(payload ? { type: "quick_reply", text, payload } : { type: "quick_reply", text });
    }
  }
  return out;
}

export function TemplateEditorModal({
  open,
  mode,
  template,
  previewLeads,
  whatsappNumbers,
  onClose,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState(template?.name ?? "");
  const [channel, setChannel] = useState<Channel>(
    (template?.channel as Channel) ?? "WHATSAPP",
  );
  const [category, setCategory] = useState(template?.category ?? "welcome");
  const [status, setStatus] = useState(template?.status ?? "draft");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [metaTemplateName, setMetaTemplateName] = useState(
    template?.metaTemplateName ?? "",
  );
  const [metaApprovalStatus, setMetaApprovalStatus] = useState(
    template?.metaApprovalStatus ?? "not_submitted",
  );
  const [senderPhoneNumberId, setSenderPhoneNumberId] = useState(
    template?.senderPhoneNumberId ?? "",
  );
  const [metaBodyParams, setMetaBodyParams] = useState<string[]>(
    template?.metaBodyParams ?? [],
  );
  const [metaButtons, setMetaButtons] = useState<MetaTemplateButton[]>(
    template?.metaButtons ?? [],
  );
  const [language, setLanguage] = useState(template?.language ?? "de");
  const [leadId, setLeadId] = useState(previewLeads[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const isEmail = channel === "EMAIL";
  const isInternal = channel === "INTERNAL";
  const isWhatsapp = channel === "WHATSAPP";
  const selectedSender = whatsappNumbers.find(
    (n) => n.phoneNumberId === senderPhoneNumberId,
  );

  const ctx = useMemo(
    () => previewLeads.find((l) => l.id === leadId)?.ctx ?? {},
    [previewLeads, leadId],
  );
  const unknownVars = useMemo(() => {
    const used = extractVariables(`${subject} ${body}`);
    return used.filter((v) => !KNOWN_VARIABLE_KEYS.includes(v));
  }, [subject, body]);

  function setParam(index: number, value: string) {
    setMetaBodyParams((prev) => prev.map((p, i) => (i === index ? value : p)));
  }
  function addParam() {
    setMetaBodyParams((prev) => [...prev, ""]);
  }
  function removeParam(index: number) {
    setMetaBodyParams((prev) => prev.filter((_, i) => i !== index));
  }

  function addButton() {
    setMetaButtons((prev) =>
      prev.length >= 10
        ? prev
        : [...prev, { type: "quick_reply", text: "" }],
    );
  }
  function updateButton(index: number, patch: Partial<MetaTemplateButton>) {
    setMetaButtons((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    );
  }
  function removeButton(index: number) {
    setMetaButtons((prev) => prev.filter((_, i) => i !== index));
  }

  function insertVariable(token: string) {
    const el = bodyRef.current;
    const snippet = `{{${token}}}`;
    if (!el) {
      setBody((b) => b + snippet);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + snippet + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }

  function save() {
    setError(null);
    if (!name.trim() || !body.trim()) {
      setError("Name und Nachrichtentext sind erforderlich.");
      return;
    }
    if (isWhatsapp && !senderPhoneNumberId) {
      setError('Bitte unter „Senden über" eine WhatsApp-Nummer auswählen.');
      return;
    }
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        subject: isEmail ? subject.trim() || null : null,
        body,
        category,
        status,
        metaTemplateName: metaTemplateName.trim() || null,
        // Only WhatsApp templates carry a Meta approval status; email is null.
        metaApprovalStatus: isWhatsapp ? metaApprovalStatus : null,
        // Sender ("Senden über") is stored for WhatsApp only.
        senderPhoneNumberId: isWhatsapp ? senderPhoneNumberId : null,
        // Ordered Meta body parameters ({{1}}, {{2}} …) — WhatsApp only. Empty
        // rows are dropped so a template without variables stays "static".
        metaBodyParams: isWhatsapp
          ? metaBodyParams.map((p) => p.trim()).filter((p) => p.length > 0)
          : [],
        // Interactive Meta buttons (WhatsApp only). Drop rows without a label,
        // and only keep the field relevant to each button type.
        metaButtons: isWhatsapp ? cleanButtons(metaButtons) : [],
        // Meta template locale — must match the approved template's language.
        language: isWhatsapp ? language : "de",
      };
      const res =
        mode === "create"
          ? await createAutomationTemplate({ ...payload, channel })
          : await updateAutomationTemplate({ id: template!.id, ...payload });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  function remove() {
    if (!template) return;
    if (!window.confirm(`Vorlage „${template.name}" wirklich löschen?`)) return;
    startTransition(async () => {
      const res = await deleteAutomationTemplate({ id: template.id });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal
      open={open}
      size="lg"
      onClose={onClose}
      title={mode === "create" ? "Neue Vorlage" : "Vorlage bearbeiten"}
      description="Variablen werden beim Versand automatisch ersetzt. Es werden keine echten Nachrichten gesendet."
      footer={
        <div className="flex w-full items-center justify-between">
          {mode === "edit" ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="text-sm font-medium text-danger transition hover:underline disabled:opacity-50"
            >
              Löschen
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-surface-subtle"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Speichern …" : "Speichern"}
            </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kanal">
              <select
                className="input"
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                disabled={mode === "edit"}
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">E-Mail</option>
                <option value="INTERNAL">Intern</option>
              </select>
            </Field>
            <Field label="Kategorie">
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {TEMPLATE_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="draft">Entwurf</option>
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
              </select>
            </Field>
            <Field label="WhatsApp-Template (Meta)">
              <input
                className="input"
                placeholder="optional"
                value={metaTemplateName}
                onChange={(e) => setMetaTemplateName(e.target.value)}
              />
            </Field>
          </div>

          {isWhatsapp ? (
            <>
              <Field label="Senden über (WhatsApp-Nummer) *">
                <select
                  className="input"
                  value={senderPhoneNumberId}
                  onChange={(e) => setSenderPhoneNumberId(e.target.value)}
                >
                  <option value="">— Nummer wählen —</option>
                  {whatsappNumbers.map((n) => (
                    <option key={n.phoneNumberId} value={n.phoneNumberId}>
                      {n.label} · {n.displayPhone}
                    </option>
                  ))}
                </select>
                {whatsappNumbers.length === 0 ? (
                  <p className="mt-1 text-[11px] text-danger">
                    Keine aktive WhatsApp-Nummer vorhanden. Bitte zuerst unter
                    „System → WhatsApp-Nummern“ eine Nummer anlegen/aktivieren.
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-ink-muted">
                    Pflichtfeld – Nachrichten dieser Vorlage werden von genau
                    dieser Nummer gesendet. Keine automatische Auswahl.
                  </p>
                )}
              </Field>
              <Field label="Sprache (Meta-Locale)">
                <select
                  className="input"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {!["de", "de_DE", "en", "en_US", "en_GB"].includes(language) ? (
                    <option value={language}>{language}</option>
                  ) : null}
                  <option value="de">Deutsch (de)</option>
                  <option value="de_DE">Deutsch (de_DE)</option>
                  <option value="en_US">Englisch (en_US) – Testtemplate hello_world</option>
                  <option value="en">Englisch (en)</option>
                  <option value="en_GB">Englisch (en_GB)</option>
                </select>
                <p className="mt-1 text-[11px] text-ink-muted">
                  Muss <b>exakt</b> der Sprache des freigegebenen Meta-Templates
                  entsprechen. Sonst lehnt Meta mit „#132001 – template name does
                  not exist in the translation“ ab.
                </p>
              </Field>
              <Field label="Meta-Freigabestatus">
                <select
                  className="input"
                  value={metaApprovalStatus}
                  onChange={(e) =>
                    setMetaApprovalStatus(
                      e.target.value as typeof metaApprovalStatus,
                    )
                  }
                >
                  <option value="not_submitted">Nicht eingereicht</option>
                  <option value="pending">In Prüfung</option>
                  <option value="approved">Freigegeben (Live-Versand aktiv)</option>
                  <option value="rejected">Abgelehnt</option>
                </select>
                <p className="mt-1 text-[11px] text-ink-muted">
                  Echter WhatsApp-Versand ist erst bei „Freigegeben“ möglich.
                </p>
              </Field>
              <Field label="Meta-Variablen (Reihenfolge = {{1}}, {{2}} …)">
                <p className="mb-2 text-[11px] text-ink-muted">
                  Meta nutzt <b>nummerierte</b> Platzhalter. Ordne hier jeder
                  Position exakt die CRM-Variable zu, die im Meta-Template an
                  Stelle {"{{1}}"}, {"{{2}}"} … steht. Keine Variablen? Einfach
                  leer lassen (statische Vorlage).
                </p>
                <div className="space-y-2">
                  {metaBodyParams.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-9 shrink-0 rounded-md bg-brand-50 px-1.5 py-1 text-center text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200">
                        {`{{${i + 1}}}`}
                      </span>
                      <select
                        className="input flex-1"
                        value={
                          TEMPLATE_VARIABLES.some((v) => `{{${v.key}}}` === p)
                            ? p
                            : ""
                        }
                        onChange={(e) => setParam(i, e.target.value)}
                      >
                        <option value="">— CRM-Variable wählen —</option>
                        {TEMPLATE_VARIABLES.map((v) => (
                          <option key={v.key} value={`{{${v.key}}}`}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeParam(i)}
                        className="shrink-0 rounded-md border border-ink/10 px-2 py-1 text-[12px] font-medium text-danger transition hover:bg-danger/5"
                        aria-label={`Position ${i + 1} entfernen`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addParam}
                  className="mt-2 rounded-lg border border-dashed border-ink/20 px-3 py-1.5 text-[12px] font-medium text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
                >
                  + Variable ({`{{${metaBodyParams.length + 1}}}`})
                </button>
              </Field>
              <Field label="Buttons (Meta-Komponenten)">
                <p className="mb-2 text-[11px] text-ink-muted">
                  Schnellantwort-, Website- und Anruf-Buttons. Sie müssen{" "}
                  <b>exakt</b> (Reihenfolge & Typ) dem freigegebenen Meta-Template
                  entsprechen. Website-Buttons mit einer Variable (z.&nbsp;B.{" "}
                  {"{{upload_link}}"}) werden dynamisch befüllt.
                </p>
                <div className="space-y-2">
                  {metaButtons.map((b, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-ink/[0.08] bg-white/60 p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 shrink-0 rounded-md bg-ink/5 px-1.5 py-1 text-center text-[11px] font-semibold text-ink-soft">
                          {i + 1}
                        </span>
                        <select
                          className="input flex-1"
                          value={b.type}
                          onChange={(e) =>
                            updateButton(i, {
                              type: e.target.value as MetaTemplateButtonType,
                              url: undefined,
                              phoneNumber: undefined,
                              payload: undefined,
                            })
                          }
                        >
                          {(
                            Object.keys(
                              META_BUTTON_TYPE_LABEL,
                            ) as MetaTemplateButtonType[]
                          ).map((t) => (
                            <option key={t} value={t}>
                              {META_BUTTON_TYPE_LABEL[t]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeButton(i)}
                          className="shrink-0 rounded-md border border-ink/10 px-2 py-1 text-[12px] font-medium text-danger transition hover:bg-danger/5"
                          aria-label={`Button ${i + 1} entfernen`}
                        >
                          ×
                        </button>
                      </div>
                      <input
                        className="input mt-2"
                        placeholder="Button-Text (max. 25 Zeichen)"
                        maxLength={25}
                        value={b.text}
                        onChange={(e) => updateButton(i, { text: e.target.value })}
                      />
                      {b.type === "url" ? (
                        <input
                          className="input mt-2"
                          placeholder="https://… (optional mit {{upload_link}})"
                          value={b.url ?? ""}
                          onChange={(e) => updateButton(i, { url: e.target.value })}
                        />
                      ) : null}
                      {b.type === "phone_number" ? (
                        <input
                          className="input mt-2"
                          placeholder="+491701234567"
                          value={b.phoneNumber ?? ""}
                          onChange={(e) =>
                            updateButton(i, { phoneNumber: e.target.value })
                          }
                        />
                      ) : null}
                      {b.type === "quick_reply" ? (
                        <input
                          className="input mt-2"
                          placeholder="Payload (optional, z.B. INTERESSE_JA)"
                          value={b.payload ?? ""}
                          onChange={(e) =>
                            updateButton(i, { payload: e.target.value })
                          }
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
                {metaButtons.length < 10 ? (
                  <button
                    type="button"
                    onClick={addButton}
                    className="mt-2 rounded-lg border border-dashed border-ink/20 px-3 py-1.5 text-[12px] font-medium text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
                  >
                    + Button
                  </button>
                ) : (
                  <p className="mt-2 text-[11px] text-ink-muted">
                    Maximal 10 Buttons je Vorlage (Meta-Limit).
                  </p>
                )}
              </Field>
            </>
          ) : null}

          {isEmail ? (
            <Field label="Betreff">
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
          ) : null}

          <Field label="Nachricht">
            <textarea
              ref={bodyRef}
              className="input min-h-[160px] leading-relaxed"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-ink-muted">
              <span>{body.length} Zeichen</span>
              {isInternal ? (
                <span className="text-amber-600">Interne Vorlage – wird nie versendet</span>
              ) : isEmail ? (
                <span>E-Mail mit Betreff</span>
              ) : (
                <span>WhatsApp – kurz & persönlich halten</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="rounded-full border border-ink/10 bg-white px-2 py-0.5 text-[11px] font-medium text-ink-soft transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  {v.label}
                </button>
              ))}
            </div>
            {unknownVars.length > 0 ? (
              <p className="mt-2 text-[11px] text-amber-600">
                Unbekannte Variablen: {unknownVars.map((v) => `{{${v}}}`).join(", ")}
              </p>
            ) : null}
          </Field>
        </div>

        <div className="space-y-3">
          <Field label="Vorschau mit Demo-Lead">
            <select className="input" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              {previewLeads.length === 0 ? <option value="">Keine Demo-Leads</option> : null}
              {previewLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="rounded-xl border border-ink/[0.06] bg-surface-subtle/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Live-Vorschau
            </p>
            {isWhatsapp ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                <span className="font-semibold text-ink">Senden über:</span>
                {selectedSender ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-200">
                    {selectedSender.label} · {selectedSender.displayPhone}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 ring-1 ring-amber-200">
                    Keine Nummer gewählt
                  </span>
                )}
              </p>
            ) : null}
            {isWhatsapp && metaBodyParams.some((p) => p.trim()) ? (
              <div className="mt-2 space-y-1 rounded-lg border border-ink/[0.06] bg-white/70 p-2">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Meta-Variablen
                </p>
                {metaBodyParams.map((p, i) =>
                  p.trim() ? (
                    <p key={i} className="text-[11.5px] text-ink-soft">
                      <span className="font-semibold text-brand-700">{`{{${i + 1}}}`}</span>
                      {" = "}
                      <span className="text-ink">{renderPreview(p, ctx)}</span>
                    </p>
                  ) : null,
                )}
              </div>
            ) : null}
            <div className="mt-2 rounded-lg bg-white p-3 shadow-sm ring-1 ring-ink/[0.04]">
              {isEmail && subject ? (
                <p className="border-b border-ink/[0.06] pb-2 text-sm font-semibold text-navy-950">
                  {renderPreview(subject, ctx)}
                </p>
              ) : null}
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {body ? renderPreview(body, ctx) : "Noch kein Text."}
              </p>
              {isWhatsapp && metaButtons.some((b) => b.text.trim()) ? (
                <div className="mt-2 -mx-3 border-t border-ink/[0.06]">
                  {metaButtons
                    .filter((b) => b.text.trim())
                    .map((b, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-center gap-1.5 border-b border-ink/[0.06] px-3 py-2 text-[13px] font-medium text-[#0284c7] last:border-b-0"
                      >
                        <ButtonGlyph type={b.type} />
                        <span className="truncate">{b.text.trim()}</span>
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      </div>
    </Modal>
  );
}

/** Small WhatsApp-style glyph shown next to each button in the live preview. */
function ButtonGlyph({ type }: { type: MetaTemplateButtonType }) {
  const common = {
    width: 13,
    height: 13,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (type === "url") {
    return (
      <svg {...common}>
        <path d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    );
  }
  if (type === "phone_number") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12.5px] font-semibold text-ink">{label}</label>
      {children}
    </div>
  );
}
