"use client";
/**
 * TemplateManager — premium card grid for message templates.
 * WhatsApp/E-Mail/Internal, with channel icon, body preview, stats, actions.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  duplicateAutomationTemplate,
  updateAutomationTemplate,
} from "@/server/actions/automation";
import {
  TEMPLATE_CATEGORY_LABEL,
  TRIGGER_LABEL,
  type AutomationTemplateEntry,
} from "../../types";
import {
  TemplateEditorModal,
  type PreviewLead,
  type WhatsAppSenderOption,
} from "./TemplateEditorModal";

interface Props {
  templates: ReadonlyArray<AutomationTemplateEntry>;
  previewLeads: ReadonlyArray<PreviewLead>;
  whatsappNumbers: ReadonlyArray<WhatsAppSenderOption>;
}

export function TemplateManager({
  templates,
  previewLeads,
  whatsappNumbers,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AutomationTemplateEntry | null>(null);

  function duplicate(id: string) {
    start(async () => { await duplicateAutomationTemplate({ id }); router.refresh(); });
  }

  function toggle(t: AutomationTemplateEntry) {
    start(async () => {
      await updateAutomationTemplate({ id: t.id, status: t.status === "active" ? "inactive" : "active" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-soft">
          {templates.length} {templates.length === 1 ? "Vorlage" : "Vorlagen"} ·{" "}
          <span className="text-emerald-600">
            {templates.filter((t) => t.status === "active").length} aktiv
          </span>
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          <PlusIcon className="h-4 w-4" />
          Neue Vorlage
        </button>
      </div>

      {/* Empty state */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink/15 bg-surface-subtle/40 py-14 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <MailIcon className="h-6 w-6" />
          </span>
          <p className="text-[15px] font-semibold text-navy-950">Noch keine Vorlagen</p>
          <p className="mt-1.5 max-w-xs text-[13px] text-ink-muted">
            Erstelle deine erste Nachrichtenvorlage für WhatsApp, E-Mail oder interne Hinweise.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" />
            Erste Vorlage erstellen
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              senderLabel={
                t.channel === "WHATSAPP"
                  ? (whatsappNumbers.find(
                      (n) => n.phoneNumberId === t.senderPhoneNumberId,
                    )?.label ?? null)
                  : null
              }
              pending={pending}
              onToggle={() => toggle(t)}
              onDuplicate={() => duplicate(t.id)}
              onEdit={() => setEditing(t)}
            />
          ))}
        </div>
      )}

      {creating ? (
        <TemplateEditorModal
          open={creating}
          mode="create"
          previewLeads={previewLeads}
          whatsappNumbers={whatsappNumbers}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <TemplateEditorModal
          open
          mode="edit"
          template={editing}
          previewLeads={previewLeads}
          whatsappNumbers={whatsappNumbers}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

// ── TemplateCard ──────────────────────────────────────────────────────────────

function TemplateCard({
  template: t,
  senderLabel,
  pending,
  onToggle,
  onDuplicate,
  onEdit,
}: {
  template: AutomationTemplateEntry;
  senderLabel: string | null;
  pending: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
}) {
  const channel = CHANNEL_META[t.channel] ?? CHANNEL_META["INTERNAL"]!;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink/[0.08] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_4px_16px_-6px_rgba(15,23,42,0.12)]">
      {/* Channel accent bar */}
      <div className={`h-[3px] w-full ${channel.bar}`} />

      <div className="flex flex-1 flex-col p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${channel.iconBg}`}>
              {channel.icon}
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-display text-[15px] font-bold text-navy-950">
                {t.name}
              </h3>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {channel.label}
                {t.subject ? ` · Betreff: ${t.subject}` : ""}
              </p>
            </div>
          </div>
          <span className={[
            "mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
            t.status === "active"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : t.status === "draft"
                ? "bg-amber-50 text-amber-700 ring-amber-200"
                : "bg-slate-100 text-slate-600 ring-slate-200",
          ].join(" ")}>
            {STATUS_LABEL[t.status] ?? t.status}
          </span>
        </div>

        {/* Category + trigger badges */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
            {TEMPLATE_CATEGORY_LABEL[t.category] ?? t.category}
          </span>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200">
            {TRIGGER_LABEL[t.trigger as keyof typeof TRIGGER_LABEL] ?? t.trigger}
          </span>
          {t.isDemo ? (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200">Demo</span>
          ) : (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-700 ring-1 ring-brand-200">Produktiv</span>
          )}
          {t.channel === "WHATSAPP" ? (
            senderLabel ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                Senden über: {senderLabel}
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                Kein Absender
              </span>
            )
          ) : null}
        </div>

        {/* Body preview */}
        <p className="mt-3 flex-1 line-clamp-4 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
          {t.body}
        </p>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-ink/[0.06] pt-3.5">
          <span className="text-[11.5px] text-ink-muted">
            {t.usageCount > 0
              ? `${t.usageCount}× gesendet${t.lastUsedAt ? ` · ${t.lastUsedAt.toLocaleDateString("de-DE")}` : ""}`
              : "Noch nicht gesendet"}
          </span>
          <div className="flex items-center gap-1">
            <ActionBtn onClick={onToggle} disabled={pending}>
              {t.status === "active" ? "Pausieren" : "Aktivieren"}
            </ActionBtn>
            <ActionBtn onClick={onDuplicate} disabled={pending}>Duplizieren</ActionBtn>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700 hover:bg-brand-100"
            >
              Bearbeiten
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ActionBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
    >
      {children}
    </button>
  );
}

// ── metadata ──────────────────────────────────────────────────────────────────

type IC = React.SVGProps<SVGSVGElement>;
const ic = (d: React.ReactNode) =>
  function Icon(p: IC) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>;
  };

const MailIcon      = ic(<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></>);
const WhatsappIcon  = ic(<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>);
const InternalIcon  = ic(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>);
const PlusIcon      = ic(<><path d="M12 5v14M5 12h14"/></>);

const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode; iconBg: string; bar: string }> = {
  WHATSAPP: {
    label: "WhatsApp",
    icon: <WhatsappIcon className="h-5 w-5 text-emerald-600" />,
    iconBg: "bg-emerald-50",
    bar: "bg-emerald-400",
  },
  EMAIL: {
    label: "E-Mail",
    icon: <MailIcon className="h-5 w-5 text-indigo-600" />,
    iconBg: "bg-indigo-50",
    bar: "bg-indigo-400",
  },
  INTERNAL: {
    label: "Intern",
    icon: <InternalIcon className="h-5 w-5 text-slate-500" />,
    iconBg: "bg-slate-100",
    bar: "bg-slate-300",
  },
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  draft: "Entwurf",
  inactive: "Inaktiv",
};
