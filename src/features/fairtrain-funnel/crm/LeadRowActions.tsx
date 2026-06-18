"use client";
/**
 * LeadRowActions — per-row quick-action popover for the lead list.
 *
 * Bundles the operator's fast mutations (status, priority, assignee, next
 * action, archive, edit) behind a three-dot button. Every action persists
 * through an existing server action and refreshes the route — the server side
 * writes the ActivityLog/audit entry.
 *
 * The popover is rendered via a React portal so card-level stacking contexts
 * (backdrop-blur, transforms) never clip or visually cover it.
 */
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

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

interface Anchor {
  top: number;
  right: number;
}

export function LeadRowActions({ lead, users, onEdit }: Props) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [when, setWhen] = useState<string>(toLocalInput(lead.nextFollowUpAt));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const recompute = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    recompute();
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [open, recompute]);

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

  const popover =
    open && mounted && anchor
      ? createPortal(
          <>
            <div
              aria-hidden
              className="fixed inset-0 z-[80] bg-ink/[0.04] backdrop-blur-[1px]"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />
            <div
              role="dialog"
              aria-label="Schnellaktionen"
              className="fixed z-[90] w-72 rounded-2xl border border-ink/[0.06] bg-white/95 p-4 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35),0_8px_20px_-8px_rgba(15,23,42,0.15)] ring-1 ring-inset ring-white/60 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/80"
              style={{ top: anchor.top, right: anchor.right }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="mb-3 w-full rounded-xl border border-ink/[0.08] bg-white px-3 py-2 text-left text-[13px] font-semibold text-ink shadow-sm transition hover:border-ink/15 hover:bg-surface-subtle"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              >
                Lead bearbeiten…
              </button>

              <Row label="Status">
                <select
                  className="input h-9 w-full py-0 text-[12.5px]"
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
                  className="input h-9 w-full py-0 text-[12.5px]"
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
                  className="input h-9 w-full py-0 text-[12.5px]"
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
                <div className="flex items-center gap-1.5">
                  <input
                    type="datetime-local"
                    className="input h-9 flex-1 py-0 text-[12.5px]"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    disabled={pending}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
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
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50/60 px-3 py-2 text-left text-[13px] font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                disabled={pending}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Diesen Lead archivieren? Er wird aus aktiven Listen ausgeblendet.",
                    )
                  )
                    return;
                  run(() => archiveLead({ leadId: lead.id, archived: true }));
                }}
              >
                Lead archivieren
              </button>

              {error ? (
                <p className="mt-2 text-[11.5px] font-medium text-danger">{error}</p>
              ) : null}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Aktionen"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Aktionen"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink/[0.08] bg-white/80 text-ink-soft shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-ink/15 hover:bg-white hover:text-brand-700 hover:shadow-[0_6px_14px_-8px_rgba(15,23,42,0.18)]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {popover}
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2.5">
      <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
