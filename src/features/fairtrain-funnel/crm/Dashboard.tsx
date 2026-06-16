/**
 * Lead Control Center — the operator's home screen.
 *
 * The dashboard is a *briefing*, not a report. The information hierarchy is
 * intentional and ranked by what a closer needs to decide their next move:
 *
 *   1. Welcome strip          —  who you are, what day it is
 *   2. Dashboard nav          —  jump anywhere in 1 click
 *   3. Heute wichtig          —  the priority briefing (highest impact)
 *   4. Executive KPIs         —  hero + secondary metric strip
 *   5. Pipeline funnel        —  flow distribution
 *   6. Neueste Leads          —  recent intake stream
 *
 * Sections are introduced with editorial labels — calm typographic anchors
 * inspired by Linear and Notion. Everything is server-rendered.
 */
import Link from "next/link";

import type {
  DashboardIntelligence,
  EnrichedLeadSummary,
  LeadKpis,
  LeadSummary,
  UserSummary,
} from "../types";
import { can } from "../auth/permissions";
import { PriorityBriefing } from "./DashboardActions";
import { ExecutiveKpiStrip } from "./DashboardKpis";
import { DashboardNav } from "./DashboardNav";
import { RecentLeads } from "./DashboardRecent";
import { OperationalKpiBar } from "./OperationalKpiBar";
import { PipelineKanban } from "./PipelineKanban";
import { PriorityLeadsStrip } from "./PriorityLeadsStrip";
import { SalesPulse, type SalesPulseProps } from "./sales/SalesPulse";

interface DashboardProps {
  kpis: LeadKpis;
  intelligence: DashboardIntelligence;
  recent: ReadonlyArray<LeadSummary>;
  /** Active leads with computed insights — drives the priority strip + kanban. */
  enrichedActive: ReadonlyArray<EnrichedLeadSummary>;
  inquiriesNew: number;
  /** Logged-in operator — drives the personalised greeting. */
  currentUser: UserSummary;
  /** Sales-side pulse (only rendered when the user has analytics rights). */
  pulse: SalesPulseProps | null;
}

const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function Dashboard({
  kpis,
  intelligence,
  recent,
  enrichedActive,
  inquiriesNew,
  currentUser,
  pulse,
}: DashboardProps) {
  const showPulse = pulse && can(currentUser.role, "canViewAnalytics");
  const today = new Date();
  const urgencyCount = intelligence.priorities.reduce(
    (sum, signal) =>
      signal.tone === "critical" ||
      signal.tone === "urgent" ||
      signal.tone === "warning"
        ? sum + signal.count
        : sum,
    0,
  );

  return (
    <div className="space-y-10 md:space-y-12">
      <WelcomeStrip
        today={today}
        urgencyCount={urgencyCount}
        inquiriesNew={inquiriesNew}
        userName={currentUser.name}
      />
      <DashboardNav />

      <OperationalKpiBar active={enrichedActive} kpis={kpis} />

      <PriorityLeadsStrip leads={enrichedActive} />

      <Section
        eyebrow="Heute wichtig"
        title="Was jetzt zählt"
        hint="Priorisiert nach Dringlichkeit — eine Klick weit von der Aktion."
      >
        <PriorityBriefing signals={intelligence.priorities} />
      </Section>

      <Section
        eyebrow="Executive Overview"
        title="Kennzahlen"
        hint="Jede Karte führt direkt in die gefilterte Liste."
      >
        <ExecutiveKpiStrip kpis={kpis} />
      </Section>

      <PipelineKanban leads={enrichedActive} />

      {showPulse && pulse ? <SalesPulse {...pulse} /> : null}

      <Section
        eyebrow="Eingang"
        title="Neueste Leads"
        hint="Die letzten Eingänge — klicke eine Zeile für die Details."
      >
        <RecentLeads recent={recent} />
      </Section>
    </div>
  );
}

// ---- welcome --------------------------------------------------------------

interface WelcomeStripProps {
  today: Date;
  urgencyCount: number;
  inquiriesNew: number;
  userName: string;
}

function WelcomeStrip({
  today,
  urgencyCount,
  inquiriesNew,
  userName,
}: WelcomeStripProps) {
  const hour = today.getHours();
  const greeting =
    hour < 5
      ? "Späte Schicht"
      : hour < 11
        ? "Guten Morgen"
        : hour < 18
          ? "Hallo"
          : "Guten Abend";

  const firstName = userName.trim().split(/\s+/)[0] ?? userName;

  const headline =
    urgencyCount > 0
      ? `${urgencyCount} Vorgang${urgencyCount === 1 ? "" : "e"} brauchen Aufmerksamkeit.`
      : "Alles im grünen Bereich.";

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-700">
          Lead Control Center
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy-950 md:text-[34px]">
          {greeting}, {firstName}.{" "}
          <span className="text-ink-soft">{headline}</span>
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {inquiriesNew > 0 ? (
          <Link
            href="/crm/inquiries"
            className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-[13px] font-medium text-brand-800 shadow-sm transition hover:bg-brand-100"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {inquiriesNew} neue Anfrage{inquiriesNew === 1 ? "" : "n"}
          </Link>
        ) : null}
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink-soft shadow-sm">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {DATE_FMT.format(today)}
        </span>
      </div>
    </header>
  );
}

// ---- section frame --------------------------------------------------------

function Section({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 md:space-y-5">
      <header className="flex items-baseline justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
            {eyebrow}
          </p>
          <h2 className="font-display text-[18px] font-bold tracking-tight text-navy-950 md:text-[20px]">
            {title}
          </h2>
        </div>
        <span className="hidden max-w-[40ch] text-right text-[12px] text-ink-muted sm:inline">
          {hint}
        </span>
      </header>
      {children}
    </section>
  );
}
