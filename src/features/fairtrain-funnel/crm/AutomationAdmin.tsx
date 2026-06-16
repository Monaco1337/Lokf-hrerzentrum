"use client";
/**
 * CRM admin — manage automatic contact templates and review send history.
 * Plain German, no technical codes on screen.
 */
import Link from "next/link";
import { useState } from "react";

import type { AutomationLogEntry, AutomationTemplateEntry } from "../types";
import { AutomationStatusBadge } from "./AutomationStatusBadge";
import { AutomationTemplateEditor } from "./AutomationTemplateEditor";
import { channelLabel } from "./leadLabels";

type Tab = "templates" | "logs";

interface Props {
  templates: AutomationTemplateEntry[];
  logs: AutomationLogEntry[];
}

export function AutomationAdmin({ templates, logs }: Props) {
  const [tab, setTab] = useState<Tab>("templates");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy-950">
          Automatische Nachrichten
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Diese Nachrichten gehen automatisch raus, sobald eine neue Anfrage
          eingeht.
        </p>
      </header>

      <div className="inline-flex rounded-xl bg-surface-subtle p-1 ring-1 ring-ink/[0.05]">
        <TabButton active={tab === "templates"} onClick={() => setTab("templates")}>
          Vorlagen
        </TabButton>
        <TabButton active={tab === "logs"} onClick={() => setTab("logs")}>
          Verlauf
        </TabButton>
      </div>

      {tab === "templates" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {templates.map((t) => (
            <AutomationTemplateEditor key={t.id} template={t} />
          ))}
        </div>
      ) : (
        <LogsList logs={logs} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg px-4 py-1.5 text-sm font-semibold transition",
        active
          ? "bg-white text-navy-950 shadow-sm ring-1 ring-ink/[0.05]"
          : "text-ink-muted hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function LogsList({ logs }: { logs: AutomationLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-ink/15 bg-surface-subtle/40 p-8 text-center text-sm text-ink-muted">
        Noch keine automatischen Nachrichten versendet.
      </p>
    );
  }

  return (
    <ul className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/[0.05]">
      {logs.map((log, i) => (
        <li
          key={log.id}
          className={[
            "flex flex-wrap items-center justify-between gap-3 px-5 py-3.5",
            i > 0 ? "border-t border-ink/[0.05]" : "",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-subtle text-ink-soft ring-1 ring-ink/[0.05]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium text-ink">
                {channelLabel(log.channel)}
                {log.isTest ? (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    Test
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-ink-muted">
                {log.createdAt.toLocaleString("de-DE")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AutomationStatusBadge status={log.status} />
            <Link
              href={`/crm/leads/${log.leadId}`}
              className="text-sm font-medium text-brand-700 transition hover:text-brand-800"
            >
              Lead öffnen
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
