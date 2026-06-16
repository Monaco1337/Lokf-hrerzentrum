/**
 * Presentational fact sections for the lead detail page.
 *
 * Pure, server-rendered cards (master data, agency, CV interview, eligibility,
 * documents, history). Extracted from LeadDetail.tsx to keep each file under
 * the 300-line guardrail. All copy is plain German.
 */
import type { ReactNode } from "react";

import { getQuestionById } from "../scoring/eligibilityQuestions";
import type {
  DocumentEntry,
  EligibilityAnswerEntry,
  LeadDetail as LeadDetailT,
  StatusHistoryEntry,
} from "../types";
import {
  EMPLOYMENT_LABEL,
  FUNNEL_LABEL,
  LOCATION_LABEL,
  documentLabel,
  humanizeSource,
  statusLabel,
} from "./leadLabels";

export function SectionCard({
  title,
  icon,
  action,
  className,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={[
        "rounded-2xl border border-ink/[0.06] bg-white p-5 shadow-card md:p-6",
        className ?? "",
      ].join(" ")}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-navy-950">
          {icon ? <span className="text-ink-soft">{icon}</span> : null}
          {title}
        </h2>
        {action}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function boolLabel(v: boolean | null): string {
  if (v === null) return "–";
  return v ? "Ja" : "Nein";
}

export function StammdatenCard({ lead }: { lead: LeadDetailT }) {
  return (
    <SectionCard title="Stammdaten">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label="Situation" value={FUNNEL_LABEL[lead.funnelPath]} />
        <Field label="Beschäftigung" value={EMPLOYMENT_LABEL[lead.employmentStatus]} />
        <Field label="Wunsch-Standort" value={LOCATION_LABEL[lead.preferredLocation]} />
        <Field label="Wohnort" value={lead.city ?? "–"} />
        <Field
          label="Adresse"
          value={[lead.street, lead.houseNumber].filter(Boolean).join(" ") || "–"}
        />
        <Field label="PLZ" value={lead.postalCode ?? "–"} />
        <Field
          label="Geburtsdatum"
          value={lead.birthDate ? lead.birthDate.toLocaleDateString("de-DE") : "–"}
        />
        <Field label="Geburtsort" value={lead.birthPlace ?? "–"} />
        <Field label="Staatsangehörigkeit" value={lead.nationality ?? "–"} />
        <Field label="Schichtdienst bereit" value={boolLabel(lead.acceptsShiftWork)} />
        <Field label="Montage / Hotel ok" value={boolLabel(lead.acceptsTravelHotel)} />
        <Field label="Psychische Belastung ok" value={boolLabel(lead.acceptsPsychLoad)} />
        <Field label="Saubere Akte (KBA)" value={boolLabel(lead.hasNoKbaDrugEntries)} />
        <Field label="Eingang über" value={humanizeSource(lead.source)} />
      </dl>
      {lead.motivationText ? (
        <div className="mt-5 rounded-xl bg-surface-subtle p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
            Motivation
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">
            {lead.motivationText}
          </p>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function AgenturCard({ lead }: { lead: LeadDetailT }) {
  return (
    <SectionCard title="Agentur für Arbeit">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
        <Field label="Stadt / Jobcenter" value={lead.agencyCity ?? "–"} />
        <Field label="BG-/Kundennummer" value={lead.agencyCustomerNumber ?? "–"} />
        <Field label="Sachbearbeiter" value={lead.agencyCaseWorker ?? "–"} />
      </dl>
    </SectionCard>
  );
}

export function LebenslaufCard({ lead }: { lead: LeadDetailT }) {
  return (
    <SectionCard title="Lebenslauf-Interview">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Arbeitslos seit" value={lead.unemployedSince ?? "–"} />
        <Field label="Schule" value={lead.schoolEducation ?? "–"} />
        <Field label="Abschluss-Jahr" value={lead.graduationYear ?? "–"} />
        <Field label="Sprachen" value={lead.languages ?? "–"} />
        <Field label="EDV / PC" value={lead.computerSkills ?? "–"} />
        <Field label="Interessen" value={lead.interests ?? "–"} />
      </dl>
      {lead.careerHistory ? (
        <div className="mt-5 rounded-xl bg-surface-subtle p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
            Werdegang
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">
            {lead.careerHistory}
          </p>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function EligibilityCard({
  answers,
}: {
  answers: EligibilityAnswerEntry[];
}) {
  return (
    <SectionCard title="Eignungsantworten">
      <ul className="space-y-3 text-sm">
        {answers.map((a) => {
          const q = getQuestionById(a.questionId);
          const yes = a.answer === "yes";
          return (
            <li key={a.questionId} className="flex items-start justify-between gap-4">
              <span className="text-ink-soft">{q?.prompt ?? a.questionId}</span>
              <span
                className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
                  yes
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    : a.answer === "no"
                      ? "bg-red-50 text-red-700 ring-red-100"
                      : "bg-slate-100 text-slate-600 ring-slate-200",
                ].join(" ")}
              >
                {yes ? "Ja" : a.answer === "no" ? "Nein" : a.answer}
              </span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

export function DocumentsCard({ documents }: { documents: DocumentEntry[] }) {
  return (
    <SectionCard title="Generierte Dokumente">
      {documents.length === 0 ? (
        <p className="text-sm text-ink-muted">Noch keine Dokumente erstellt.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-ink/[0.06] px-3 py-2"
            >
              <span className="font-medium text-ink">{documentLabel(d.type)}</span>
              <span className="text-xs text-ink-muted">{d.status}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function StatusHistoryCard({
  history,
}: {
  history: StatusHistoryEntry[];
}) {
  return (
    <SectionCard title="Verlauf">
      <ol className="space-y-3">
        {history.map((h) => (
          <li key={h.id} className="flex items-start gap-3 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
            <div>
              <p className="text-ink">
                {h.fromStatus ? `${statusLabel(h.fromStatus)} → ` : ""}
                <strong className="font-semibold text-navy-950">
                  {statusLabel(h.toStatus)}
                </strong>
              </p>
              <p className="text-xs text-ink-muted">
                {h.createdAt.toLocaleString("de-DE")}
                {h.reason ? ` · ${h.reason}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
