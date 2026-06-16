/**
 * ProcessingPanel — "Bearbeitung & Verlauf" card on the lead detail page.
 *
 * Surfaces, in one compact block, everything a sales operator needs at a
 * glance: current status, assignee, last contact, next callback, next
 * task, and the most recent call note. The activity timeline lives next
 * to it; this panel is the "control" side, the timeline is the "history"
 * side.
 */
import type {
  CallLogEntry,
  LeadDetail,
  UserRef,
  UserSummary,
} from "../../types";

import { AssigneeSelect } from "./AssigneeSelect";

function relative(d: Date | null, now = Date.now()): string {
  if (!d) return "—";
  const diff = now - d.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `vor ${Math.max(1, minutes)} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  return `vor ${days} Tagen`;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProcessingPanel({
  lead,
  calls,
  assignees,
  canAssign,
  currentUser,
}: {
  lead: LeadDetail;
  calls: ReadonlyArray<CallLogEntry>;
  assignees: ReadonlyArray<UserSummary>;
  canAssign: boolean;
  currentUser: UserSummary;
}) {
  const lastCall = calls[0] ?? null;
  const ref: UserRef | null = lead.assignedToUser;
  const lastContactDate = lastCall?.createdAt ?? null;
  const nextCallbackDate = lead.nextFollowUpAt ?? lastCall?.callbackAt ?? null;

  void currentUser;

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-navy-950">
          Bearbeitung &amp; Verlauf
        </h2>
        <span className="text-[10.5px] uppercase tracking-wide text-ink-muted">
          Vertriebssicht
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <AssigneeSelect
          leadId={lead.id}
          current={ref}
          canEdit={canAssign}
          options={assignees.map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role,
          }))}
        />

        <dl className="space-y-2 text-[12.5px]">
          <Row label="Letzter Kontakt" value={relative(lastContactDate)} />
          <Row label="Nächster Rückruf" value={formatDate(nextCallbackDate)} />
          <Row
            label="Nächste Aufgabe"
            value={lastCall?.nextStep ?? "—"}
            wrap
          />
        </dl>
      </div>

      {lastCall?.note ? (
        <div className="mt-4 rounded-xl bg-surface-subtle/60 px-3 py-2 text-[12px] text-ink-soft">
          <span className="font-semibold text-ink">Letzte Notiz: </span>
          <span className="whitespace-pre-line">
            {lastCall.note.length > 240
              ? `${lastCall.note.slice(0, 240)}…`
              : lastCall.note}
          </span>
        </div>
      ) : null}
    </section>
  );
}

function Row({
  label,
  value,
  wrap = false,
}: {
  label: string;
  value: string;
  wrap?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd
        className={[
          "text-right text-[12.5px] text-ink",
          wrap ? "break-words" : "whitespace-nowrap",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
