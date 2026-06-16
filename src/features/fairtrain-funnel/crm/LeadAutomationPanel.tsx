"use client";
/**
 * Lead detail panel — shows automation send history and resend actions.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { resendAutomationForLead } from "@/server/actions/automation";
import type {
  AutomationLogEntry,
  AutomationTemplateEntry,
} from "../types";
import { AutomationStatusBadge } from "./AutomationStatusBadge";
import { channelLabel } from "./leadLabels";

interface Props {
  leadId: string;
  logs: AutomationLogEntry[];
  templates: AutomationTemplateEntry[];
}

export function LeadAutomationPanel({ leadId, logs, templates }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resend(templateId: string) {
    setError(null);
    startTransition(async () => {
      const res = await resendAutomationForLead({ leadId, templateId });
      if (!res.ok) setError(res.message);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3.5 py-2 text-sm font-medium text-ink shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:bg-surface-subtle disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={pending || !t.enabled}
            onClick={() => resend(t.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            {channelLabel(t.channel)} erneut senden
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <ul className="space-y-2 text-sm">
        {logs.length === 0 ? (
          <li className="text-ink-muted">Noch keine automatische Kontaktaufnahme.</li>
        ) : (
          logs.map((log) => (
            <li
              key={log.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink/[0.06] bg-surface-subtle/40 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-medium text-ink">
                  {channelLabel(log.channel)}
                </span>
                {log.isTest ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    Test
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <AutomationStatusBadge status={log.status} />
                <span className="text-xs text-ink-muted">
                  {log.createdAt.toLocaleString("de-DE")}
                </span>
              </div>
              {log.errorMessage ? (
                <p className="w-full text-xs text-danger">{log.errorMessage}</p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
