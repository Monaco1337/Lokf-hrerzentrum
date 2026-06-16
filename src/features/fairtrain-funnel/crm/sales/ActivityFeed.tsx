/**
 * ActivityFeed — chronological cross-entity feed (Stripe/Linear style).
 * Server component: receives audit rows + actor lookup, renders a clean
 * timeline grouped by day.
 */
import Link from "next/link";
import type { Route } from "next";

import type {
  AuditLogEntry,
  UserRef,
} from "@/features/fairtrain-funnel/types";

import {
  ACTIVITY_LABEL,
  activityTintClasses,
} from "./activityLabels";

interface Props {
  events: ReadonlyArray<AuditLogEntry>;
  actorById: Record<string, UserRef>;
  /** Optional map of leadId -> "Vorname Nachname" for nicer entity titles. */
  leadNameById?: Record<string, string>;
}

function formatDateHeading(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Heute";
  if (sameDay(d, yesterday)) return "Gestern";
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function groupByDay(
  events: ReadonlyArray<AuditLogEntry>,
): Array<{ key: string; date: Date; entries: AuditLogEntry[] }> {
  const out = new Map<string, { date: Date; entries: AuditLogEntry[] }>();
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    const existing = out.get(key);
    if (existing) existing.entries.push(e);
    else out.set(key, { date: e.createdAt, entries: [e] });
  }
  return Array.from(out.entries()).map(([key, value]) => ({ key, ...value }));
}

function actorLabel(
  actor: string,
  actorById: Record<string, UserRef>,
): string {
  if (actor === "system") return "System";
  return actorById[actor]?.name ?? actor;
}

export function ActivityFeed({ events, actorById, leadNameById }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-10 text-center">
        <p className="text-[14px] font-medium text-ink-soft">
          Noch keine Aktivitäten erfasst.
        </p>
        <p className="mt-1 text-[12.5px] text-ink-muted">
          Sobald Anrufe, Notizen oder Statuswechsel im System stattfinden,
          erscheinen sie hier in Echtzeit.
        </p>
      </div>
    );
  }
  const groups = groupByDay(events);
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {formatDateHeading(g.date)}
          </h3>
          <ol className="space-y-2">
            {g.entries.map((e) => {
              const visual = ACTIVITY_LABEL[e.action];
              const actor = actorLabel(e.actor, actorById);
              const isLead = e.entityType === "Lead";
              const leadName = isLead
                ? leadNameById?.[e.entityId] ?? null
                : null;
              const href = isLead ? (`/crm/leads/${e.entityId}` as Route) : null;
              const Body = (
                <div className="flex items-start gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 shadow-sm transition hover:border-ink/20 hover:shadow">
                  <span
                    className={[
                      "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ring-1 ring-inset",
                      activityTintClasses(visual.tint),
                    ].join(" ")}
                    aria-hidden
                  >
                    {visual.label.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-navy-950">
                      <span className="font-semibold">{actor}</span>{" "}
                      <span className="text-ink-soft">·</span>{" "}
                      <span>{visual.label}</span>
                      {leadName && (
                        <>
                          {" "}
                          <span className="text-ink-soft">·</span>{" "}
                          <span className="font-medium text-brand-700">
                            {leadName}
                          </span>
                        </>
                      )}
                    </p>
                    {e.details && (
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-muted">
                        {e.details.length > 240
                          ? `${e.details.slice(0, 240)}…`
                          : e.details}
                      </p>
                    )}
                  </div>
                  <time className="shrink-0 text-[11px] font-medium text-ink-muted">
                    {formatTime(e.createdAt)}
                  </time>
                </div>
              );
              return (
                <li key={e.id}>
                  {href ? (
                    <Link href={href} className="block">
                      {Body}
                    </Link>
                  ) : (
                    Body
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
