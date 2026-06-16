/**
 * CallLogList — read-only listing of prior call entries for a lead.
 */
import {
  CALL_OUTCOME_LABEL,
  CallOutcome,
  type CallLogEntry,
} from "../../types";
import { UserAvatar } from "../users/UserAvatar";
import { UserRoleBadge } from "../users/UserRoleBadge";

function formatDateTime(d: Date): string {
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TONE: Record<CallOutcome, string> = {
  ATTEMPT_NO_ANSWER: "bg-slate-50 text-slate-700 ring-slate-200",
  TALKED: "bg-sky-50 text-sky-800 ring-sky-200",
  INTERESTED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  NOT_INTERESTED: "bg-rose-50 text-rose-800 ring-rose-200",
  NOT_ELIGIBLE: "bg-rose-50 text-rose-800 ring-rose-200",
  CALLBACK_SCHEDULED: "bg-amber-50 text-amber-800 ring-amber-200",
  APPOINTMENT_SET: "bg-violet-50 text-violet-800 ring-violet-200",
  CLOSED: "bg-brand-50 text-brand-900 ring-brand-200",
};

export function CallLogList({
  entries,
}: {
  entries: ReadonlyArray<CallLogEntry>;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink/15 bg-surface-subtle/40 px-3 py-4 text-center text-[12px] text-ink-muted">
        Noch keine Anrufe dokumentiert.
      </p>
    );
  }
  return (
    <ol className="space-y-2.5">
      {entries.map((e) => (
        <li
          key={e.id}
          className="rounded-xl border border-ink/10 bg-white p-3 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <UserAvatar
              name={e.user.name}
              avatar={e.user.avatar}
              size="sm"
            />
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                <span className="font-semibold text-navy-950">
                  {e.user.name}
                </span>
                <UserRoleBadge role={e.user.role} />
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset",
                    TONE[e.outcome],
                  ].join(" ")}
                >
                  {CALL_OUTCOME_LABEL[e.outcome]}
                </span>
                <span className="ml-auto text-[11px] text-ink-muted">
                  {formatDateTime(e.createdAt)}
                </span>
              </div>
              {e.note ? (
                <p className="whitespace-pre-line text-[12.5px] text-ink-soft">
                  {e.note}
                </p>
              ) : null}
              {e.nextStep ? (
                <p className="text-[11.5px] text-ink-muted">
                  <span className="font-semibold text-ink-soft">
                    Nächster Schritt:
                  </span>{" "}
                  {e.nextStep}
                </p>
              ) : null}
              {e.callbackAt ? (
                <p className="text-[11.5px] text-ink-muted">
                  <span className="font-semibold text-ink-soft">Rückruf:</span>{" "}
                  {formatDateTime(e.callbackAt)}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
