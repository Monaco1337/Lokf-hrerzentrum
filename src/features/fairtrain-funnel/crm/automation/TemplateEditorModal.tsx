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
  type AutomationTemplateEntry,
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
            <div className="mt-2 rounded-lg bg-white p-3 shadow-sm ring-1 ring-ink/[0.04]">
              {isEmail && subject ? (
                <p className="border-b border-ink/[0.06] pb-2 text-sm font-semibold text-navy-950">
                  {renderPreview(subject, ctx)}
                </p>
              ) : null}
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {body ? renderPreview(body, ctx) : "Noch kein Text."}
              </p>
            </div>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      </div>
    </Modal>
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
