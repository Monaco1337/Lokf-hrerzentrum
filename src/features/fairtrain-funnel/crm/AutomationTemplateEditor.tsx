"use client";
/**
 * High-end, jargon-free editor for one automation template.
 *
 * Hides slugs/triggers/consent codes. Shows a friendly channel header, a
 * clean editing surface, one-click placeholder chips and an inline preview.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  previewAutomationTemplate,
  sendAutomationTest,
  updateAutomationTemplate,
} from "@/server/actions/automation";
import type { AutomationTemplateEntry } from "../types";

/** Friendly, non-technical placeholders the customer actually needs. */
const PLACEHOLDERS: ReadonlyArray<{ token: string; label: string }> = [
  { token: "name", label: "Name" },
  { token: "standort", label: "Standort" },
  { token: "interesse", label: "Interesse" },
  { token: "telefon", label: "Telefon" },
  { token: "email", label: "E-Mail" },
  { token: "datum", label: "Datum" },
];

function channelMeta(channel: string): { label: string; sub: string; icon: React.ReactNode } {
  if (channel === "WHATSAPP") {
    return {
      label: "WhatsApp-Nachricht",
      sub: "Wird automatisch nach einer neuen Anfrage gesendet.",
      icon: <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />,
    };
  }
  return {
    label: "Willkommens-E-Mail",
    sub: "Wird automatisch nach einer neuen Anfrage gesendet.",
    icon: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </>
    ),
  };
}

export function AutomationTemplateEditor({
  template,
}: {
  template: AutomationTemplateEntry;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject ?? "");
  const [body, setBody] = useState(template.body);
  const [enabled, setEnabled] = useState(template.enabled);
  const [preview, setPreview] = useState<{ subject: string | null; body: string } | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEmail = template.channel === "EMAIL";
  const meta = channelMeta(template.channel);

  function insertPlaceholder(token: string) {
    const el = bodyRef.current;
    const snippet = `{{${token}}}`;
    if (!el) {
      setBody((b) => b + snippet);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + snippet + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await updateAutomationTemplate({
        id: template.id,
        name,
        subject: isEmail ? subject : null,
        body,
        enabled,
      });
      if (!res.ok) setError(res.message);
      else {
        setMessage("Änderungen gespeichert.");
        router.refresh();
      }
    });
  }

  function doPreview() {
    setError(null);
    startTransition(async () => {
      const res = await previewAutomationTemplate({ templateId: template.id });
      if (!res.ok) setError(res.message);
      else setPreview({ subject: res.data.subject, body: res.data.body });
    });
  }

  function doTestSend() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await sendAutomationTest({
        templateId: template.id,
        recipient: testRecipient,
      });
      if (!res.ok) setError(res.message);
      else setMessage("Testnachricht wurde verschickt.");
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/[0.05]">
      <header className="flex items-center justify-between gap-3 border-b border-ink/[0.06] bg-surface-subtle/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              {meta.icon}
            </svg>
          </span>
          <div>
            <h2 className="font-display text-base font-bold tracking-tight text-navy-950">
              {meta.label}
            </h2>
            <p className="text-xs text-ink-muted">{meta.sub}</p>
          </div>
        </div>
        <Switch checked={enabled} onChange={setEnabled} />
      </header>

      <div className="space-y-4 p-5">
        <Labeled label="Interner Name" htmlFor={`name-${template.id}`}>
          <input
            id={`name-${template.id}`}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Labeled>

        {isEmail ? (
          <Labeled label="Betreff" htmlFor={`subject-${template.id}`}>
            <input
              id={`subject-${template.id}`}
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </Labeled>
        ) : null}

        <Labeled label="Nachricht" htmlFor={`body-${template.id}`}>
          <textarea
            id={`body-${template.id}`}
            ref={bodyRef}
            className="input min-h-[180px] leading-relaxed"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-ink-muted">Einfügen:</span>
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.token}
                type="button"
                onClick={() => insertPlaceholder(p.token)}
                className="rounded-full border border-ink/10 bg-white px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            Platzhalter werden beim Versand automatisch durch die echten Daten des
            Interessenten ersetzt.
          </p>
        </Labeled>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:opacity-60"
            disabled={pending}
            onClick={save}
          >
            {pending ? "Speichern …" : "Speichern"}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-ink/20 hover:bg-surface-subtle disabled:opacity-60"
            disabled={pending}
            onClick={doPreview}
          >
            Vorschau
          </button>
        </div>

        {preview ? <PreviewBubble isEmail={isEmail} preview={preview} /> : null}

        <div className="rounded-xl border border-dashed border-ink/15 bg-surface-subtle/40 p-4">
          <p className="text-xs font-medium text-ink-soft">
            Vorab testen – schickt diese Nachricht einmalig an dich.
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input
              className="input min-w-[220px] flex-1"
              placeholder={isEmail ? "deine@mail.de" : "+49170…"}
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
            />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-ink/20 hover:bg-white disabled:opacity-50"
              disabled={pending || !testRecipient.trim()}
              onClick={doTestSend}
            >
              Test senden
            </button>
          </div>
        </div>

        {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </section>
  );
}

function Labeled({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-semibold text-ink"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm font-medium text-ink"
    >
      <span className="text-ink-soft">{checked ? "Aktiv" : "Pausiert"}</span>
      <span
        className={[
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-emerald-500" : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

function PreviewBubble({
  isEmail,
  preview,
}: {
  isEmail: boolean;
  preview: { subject: string | null; body: string };
}) {
  return (
    <div className="rounded-xl border border-ink/[0.06] bg-surface-subtle/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        So sieht es beim Interessenten aus
      </p>
      <div className="mt-2 rounded-lg bg-white p-4 shadow-sm ring-1 ring-ink/[0.04]">
        {isEmail && preview.subject ? (
          <p className="border-b border-ink/[0.06] pb-2 font-semibold text-navy-950">
            {preview.subject}
          </p>
        ) : null}
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {preview.body}
        </p>
      </div>
    </div>
  );
}
