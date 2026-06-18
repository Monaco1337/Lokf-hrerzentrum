"use client";
/**
 * Template library — grid of editable message templates with create, duplicate,
 * activate/deactivate, delete and live-preview editor.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  duplicateAutomationTemplate,
  updateAutomationTemplate,
} from "@/server/actions/automation";
import {
  TEMPLATE_CATEGORY_LABEL,
  TEMPLATE_CHANNEL_LABEL,
  TEMPLATE_STATUS_LABEL,
  type AutomationTemplateEntry,
} from "../../types";
import { TemplateEditorModal, type PreviewLead } from "./TemplateEditorModal";

interface Props {
  templates: ReadonlyArray<AutomationTemplateEntry>;
  previewLeads: ReadonlyArray<PreviewLead>;
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
};
const CHANNEL_TONE: Record<string, string> = {
  WHATSAPP: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  EMAIL: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  INTERNAL: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function TemplateManager({ templates, previewLeads }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AutomationTemplateEntry | null>(null);

  function duplicate(id: string) {
    startTransition(async () => {
      await duplicateAutomationTemplate({ id });
      router.refresh();
    });
  }

  function toggle(t: AutomationTemplateEntry) {
    startTransition(async () => {
      await updateAutomationTemplate({
        id: t.id,
        status: t.status === "active" ? "inactive" : "active",
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          {templates.length} Vorlagen · WhatsApp, E-Mail und interne Hinweise
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Neue Vorlage
        </button>
      </div>

      {templates.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 bg-surface-subtle/40 p-8 text-center text-sm text-ink-muted">
          Noch keine Vorlagen. Lege die erste an oder lade die Demo-Daten.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((t) => (
            <article
              key={t.id}
              className="flex flex-col rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/[0.05]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-[15px] font-bold text-navy-950">
                    {t.name}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={CHANNEL_TONE[t.channel]}>{TEMPLATE_CHANNEL_LABEL[t.channel]}</Badge>
                    <Badge tone="bg-slate-100 text-slate-600 ring-slate-200">
                      {TEMPLATE_CATEGORY_LABEL[t.category]}
                    </Badge>
                    <Badge tone={STATUS_TONE[t.status]}>{TEMPLATE_STATUS_LABEL[t.status]}</Badge>
                    {t.isDemo ? (
                      <Badge tone="bg-violet-50 text-violet-700 ring-violet-200">Demo</Badge>
                    ) : (
                      <Badge tone="bg-brand-50 text-brand-700 ring-brand-200">Produktiv</Badge>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
                {t.body}
              </p>

              <div className="mt-3 flex items-center justify-between border-t border-ink/[0.05] pt-3 text-[11px] text-ink-muted">
                <span>
                  {t.usageCount}× verwendet
                  {t.lastUsedAt ? ` · zuletzt ${t.lastUsedAt.toLocaleDateString("de-DE")}` : ""}
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={pending} onClick={() => toggle(t)} className="font-medium text-ink-soft hover:text-ink disabled:opacity-50">
                    {t.status === "active" ? "Deaktivieren" : "Aktivieren"}
                  </button>
                  <button type="button" disabled={pending} onClick={() => duplicate(t.id)} className="font-medium text-ink-soft hover:text-ink disabled:opacity-50">
                    Duplizieren
                  </button>
                  <button type="button" onClick={() => setEditing(t)} className="font-semibold text-brand-700 hover:text-brand-800">
                    Bearbeiten
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {creating ? (
        <TemplateEditorModal
          open={creating}
          mode="create"
          previewLeads={previewLeads}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {editing ? (
        <TemplateEditorModal
          open={editing !== null}
          mode="edit"
          template={editing}
          previewLeads={previewLeads}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function Badge({ tone, children }: { tone: string | undefined; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tone ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
      {children}
    </span>
  );
}
