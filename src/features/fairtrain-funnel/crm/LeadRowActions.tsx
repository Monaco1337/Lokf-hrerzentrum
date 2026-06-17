"use client";
/**
 * LeadRowActions — per-row quick-action popover for the lead table.
 *
 * Bundles the operator's fast mutations (status, priority, assignee, next
 * action, archive, edit) into one menu so the table stays clean. Every action
 * persists through an existing server action and refreshes the route; the
 * server side writes the ActivityLog/audit entry.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { assignLead } from "@/server/actions/assignLead";
import { archiveLead, setLeadPriority } from "@/server/actions/leads";
import { scheduleFollowUp } from "@/server/actions/scheduleFollowUp";
import { updateLeadStatus } from "@/server/actions/updateLeadStatus";
import { LeadPriority, LeadStatus, type LeadSummary } from "../types";
import { PRIORITY_TONE, STATUS_TONE } from "./leadLabels";

interface Props {
  lead: LeadSummary;
  users: ReadonlyArray<{ id: string; name: string }>;
  onEdit: () => void;
}

function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

export function LeadRowActions({ lead, users, onEdit }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [when, setWhen] = useState<string>(toLocalInput(lead.nextFollowUpAt));

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.message || "Aktion fehlgeschlagen.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        aria-label="Aktionen"
        title="Aktionen"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-soft ring-1 ring-ink/10 transition hover:text-brand-700 hover:ring-ink/20"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-64 rounded-xl border border-ink/10 bg-white p-3 shadow-premium ring-1 ring-ink/[0.02]">
            <button
              type="button"
              className="mb-2 w-full rounded-lg border border-ink/10 px-3 py-1.5 text-left text-[13px] font-medium text-ink transition hover:bg-surface-subtle"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Bearbeiten…
            </button>

            <Row label="Status">
              <select
                className="input h-8 py-0 text-[12px]"
                defaultValue={lead.status}
                disabled={pending}
                onChange={(e) =>
                  run(() =>
                    updateLeadStatus({
                      leadId: lead.id,
                      toStatus: e.target.value as LeadStatus,
                      reason: "Schnellaktion Leadliste",
                      override: true,
                    }),
                  )
                }
              >
                {Object.values(LeadStatus).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_TONE[s].label}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Priorität">
              <select
                className="input h-8 py-0 text-[12px]"
                defaultValue={lead.priority}
                disabled={pending}
                onChange={(e) =>
                  run(() =>
                    setLeadPriority({
                      leadId: lead.id,
                      priority: e.target.value as LeadPriority,
                    }),
                  )
                }
              >
                {Object.values(LeadPriority).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_TONE[p].label}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Bearbeiter">
              <select
                className="input h-8 py-0 text-[12px]"
                defaultValue={lead.assignedToId ?? ""}
                disabled={pending}
                onChange={(e) =>
                  run(() =>
                    assignLead({
                      leadId: lead.id,
                      userId: e.target.value || null,
                    }),
                  )
                }
              >
                <option value="">Nicht zugewiesen</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Nächste Aktion">
              <div className="flex items-center gap-1">
                <input
                  type="datetime-local"
                  className="input h-8 py-0 text-[12px]"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  disabled={pending}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-lg bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                  disabled={pending || !when}
                  onClick={() =>
                    run(() =>
                      scheduleFollowUp({
                        leadId: lead.id,
                        when: new Date(when).toISOString(),
                      }),
                    )
                  }
                >
                  OK
                </button>
              </div>
            </Row>

            <button
              type="button"
              className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-left text-[13px] font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Diesen Lead archivieren? Er wird aus aktiven Listen ausgeblendet.")) {
                  return;
                }
                run(() => archiveLead({ leadId: lead.id, archived: true }));
              }}
            >
              Archivieren
            </button>

            {error ? <p className="mt-2 text-[11.5px] text-danger">{error}</p> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <label className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
