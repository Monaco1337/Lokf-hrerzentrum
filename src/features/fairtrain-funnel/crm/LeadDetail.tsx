import type { ReactNode } from "react";

import type {
  LeadFullDetail,
  TaskSummary,
  UserSummary,
} from "../types";
import { LeadStatus } from "../types";
import type { LeadInsights } from "../intelligence/types";
import { can } from "../auth/permissions";
import { buildNextActionCue } from "./nextActionCue";
import { FundingStatusSelect } from "./FundingStatusSelect";
import {
  FUNDING_STATUS_LABEL,
  fundingStatusFromTags,
} from "../fundingStatus";
import { STATUS_TONE } from "./leadLabels";

const DATE_TIME_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

import { FollowUpScheduler } from "./FollowUpScheduler";
import { BewerberReise } from "./operations/BewerberReise";
import { LeadStageSelect, type StageOption } from "./operations/LeadStageSelect";
import {
  AgenturCard,
  DocumentsCard,
  EligibilityCard,
  LebenslaufCard,
  SectionCard,
  StammdatenCard,
  StatusHistoryCard,
} from "./LeadFacts";
import { LeadUploadedFiles } from "./LeadUploadedFiles";
import { NotesPanel } from "./NotesPanel";
import { buildTimeline } from "./sales/ActivityTimeline";
import { CallLogPanel } from "./sales/CallLogPanel";
import { ProcessingPanel } from "./sales/ProcessingPanel";
import { SensitiveRevealToggle } from "./SensitiveRevealToggle";
import { UnifiedLeadThread } from "./messaging/UnifiedLeadThread";
import { PortalDocumentReview } from "./workspace/PortalDocumentReview";
import { PortalLinkPanel } from "./workspace/PortalLinkPanel";
import { LeadTasksPanel } from "./workspace/LeadTasksPanel";
import { LeadTimelinePanel } from "./workspace/LeadTimelinePanel";
import { LeadProfileRail } from "./workspace/LeadProfileRail";
import { LeadWorkspace, type WorkspaceTab } from "./workspace/LeadWorkspace";

const APPOINTMENT_STAGES: ReadonlyArray<StageOption> = [
  { value: LeadStatus.AA_APPOINTMENT_PENDING, label: "Termin geplant" },
  { value: LeadStatus.AA_APPOINTMENT_DONE, label: "Termin bestätigt/erledigt" },
];

function TermineRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "active" | "muted";
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-ink/[0.07] bg-white px-3.5 py-2.5">
      <span className="text-[12.5px] font-medium text-ink-soft">{label}</span>
      <span
        className={`shrink-0 text-[12.5px] font-semibold ${tone === "active" ? "text-emerald-700" : "text-ink-muted"}`}
      >
        {value}
      </span>
    </li>
  );
}

function StandItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink/[0.06] bg-surface-subtle/40 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
        {label}
      </p>
      <div className="mt-1 truncate text-[13px] font-semibold text-navy-950">
        {children}
      </div>
    </div>
  );
}

export function LeadDetail({
  data,
  currentUser,
  assignees,
  tasks,
  whatsappLive = false,
  insights,
}: {
  data: LeadFullDetail;
  currentUser: UserSummary;
  assignees: ReadonlyArray<UserSummary>;
  tasks: ReadonlyArray<TaskSummary>;
  whatsappLive?: boolean;
  insights: LeadInsights;
}) {
  const { lead } = data;
  const nextAction = buildNextActionCue(insights);
  const fundingStatus = fundingStatusFromTags(lead.tags);
  const timeline = buildTimeline({
    audit: data.auditLog,
    calls: data.callLogs,
    statusHistory: data.statusHistory,
  });
  const canAssign = can(currentUser.role, "canAssignLeads");
  const canTrack = can(currentUser.role, "canTrackCalls");

  const hasCv =
    lead.unemployedSince ||
    lead.careerHistory ||
    lead.schoolEducation ||
    lead.graduationYear ||
    lead.languages ||
    lead.computerSkills ||
    lead.interests;
  const hasAgency = lead.agencyCity || lead.agencyCustomerNumber || lead.agencyCaseWorker;

  const ownerName = lead.assignedToId
    ? (assignees.find((a) => a.id === lead.assignedToId)?.name ?? lead.assignedTo)
    : null;
  const users = assignees.map((a) => ({ id: a.id, name: a.name }));

  const contactTimes = [
    ...data.callLogs.map((c) => c.createdAt.getTime()),
    ...data.communications.map((c) => c.createdAt.getTime()),
  ];
  const lastContactAt = contactTimes.length ? new Date(Math.max(...contactTimes)) : null;

  const nowMs = Date.now();
  const upcomingCallbacks = data.callLogs
    .filter((c) => c.callbackAt && c.callbackAt.getTime() > nowMs)
    .sort((a, b) => (a.callbackAt!.getTime() - b.callbackAt!.getTime()))
    .slice(0, 5);

  const openTasks = tasks.filter((t) => t.status !== "DONE").length;

  const tabs: WorkspaceTab[] = [
    {
      id: "uebersicht",
      label: "Übersicht",
      content: (
        <div className="space-y-4">
          <SectionCard title="Aktueller Stand">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StandItem label="Status">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_TONE[lead.status].pill}`}
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full ${STATUS_TONE[lead.status].dot}`}
                  />
                  {STATUS_TONE[lead.status].label}
                </span>
              </StandItem>
              <StandItem label="Fortschritt">
                {Math.round(insights.progress * 100)}%
              </StandItem>
              <StandItem label="Nächster Schritt">
                {nextAction.label}
              </StandItem>
              <StandItem label="Letzter Kontakt">
                {lastContactAt ? DATE_TIME_FMT.format(lastContactAt) : "—"}
              </StandItem>
            </div>
          </SectionCard>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <StammdatenCard lead={lead} />
            <EligibilityCard answers={data.eligibilityAnswers} />
          </div>
          {hasCv || hasAgency ? (
            <details className="rounded-2xl border border-ink/[0.07] bg-white/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur">
              <summary className="cursor-pointer text-[13px] font-semibold text-ink-soft">
                Weitere Angaben (Lebenslauf, Agentur, sensible Daten)
              </summary>
              <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:items-start">
                {hasCv ? <LebenslaufCard lead={lead} /> : null}
                {hasAgency ? <AgenturCard lead={lead} /> : null}
              </div>
              <div className="mt-4">
                <SensitiveRevealToggle leadId={lead.id} />
              </div>
            </details>
          ) : (
            <details className="rounded-2xl border border-ink/[0.07] bg-white/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur">
              <summary className="cursor-pointer text-[13px] font-semibold text-ink-soft">
                Sensible Angaben (nur auf Anforderung)
              </summary>
              <div className="mt-4">
                <SensitiveRevealToggle leadId={lead.id} />
              </div>
            </details>
          )}
        </div>
      ),
    },
    {
      id: "kommunikation",
      label: "Kommunikation",
      content: (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
          <UnifiedLeadThread
            leadId={lead.id}
            leadName={`${lead.firstName} ${lead.lastName}`}
            phone={lead.phone}
            optOut={lead.optOut}
            whatsappLive={whatsappLive}
            communications={data.communications}
          />
          <div className="min-w-0 space-y-4">
            <SectionCard title="Anrufprotokoll">
              <CallLogPanel leadId={lead.id} initial={data.callLogs} canTrack={canTrack} />
            </SectionCard>
            <SectionCard title="Notizen">
              <NotesPanel leadId={lead.id} initialNotes={data.notes} />
            </SectionCard>
          </div>
        </div>
      ),
    },
    {
      id: "unterlagen",
      label: "Unterlagen",
      content: (
        <div className="space-y-4">
          <SectionCard title="Hochgeladene Dateien">
            <LeadUploadedFiles files={data.uploadedFiles} />
          </SectionCard>
          <SectionCard title="Bewerberportal – Unterlagenprüfung">
            <PortalDocumentReview leadId={lead.id} documents={data.portalDocuments} />
          </SectionCard>
          <SectionCard title="Bewerberportal-Link">
            <PortalLinkPanel leadId={lead.id} link={data.portalLink} />
          </SectionCard>
        </div>
      ),
    },
    {
      id: "aufgaben",
      label: "Aufgaben",
      badge: openTasks || undefined,
      content: (
        <SectionCard title="Aufgaben zu diesem Bewerber">
          <LeadTasksPanel
            leadId={lead.id}
            initial={tasks}
            users={users}
            currentUserId={currentUser.id}
          />
        </SectionCard>
      ),
    },
    {
      id: "termine",
      label: "Termine",
      content: (
        <div className="space-y-4">
          <SectionCard title="Anstehende Termine">
            <ul className="space-y-2">
              <TermineRow
                label="Nächster Rückruf / Termin"
                value={
                  lead.nextFollowUpAt
                    ? DATE_TIME_FMT.format(lead.nextFollowUpAt)
                    : "Kein Termin geplant"
                }
                tone={lead.nextFollowUpAt ? "active" : "muted"}
              />
              {upcomingCallbacks.map((c) => (
                <TermineRow
                  key={c.id}
                  label={`Rückruf · ${c.user.name}`}
                  value={
                    c.callbackAt ? DATE_TIME_FMT.format(c.callbackAt) : "—"
                  }
                  tone="active"
                />
              ))}
              <TermineRow
                label="Agenturtermin"
                value={
                  lead.status === LeadStatus.AA_APPOINTMENT_DONE
                    ? "Erledigt / bestätigt"
                    : lead.status === LeadStatus.AA_APPOINTMENT_PENDING
                      ? "Geplant"
                      : "Offen"
                }
                tone={
                  lead.status === LeadStatus.AA_APPOINTMENT_DONE
                    ? "active"
                    : "muted"
                }
              />
            </ul>
          </SectionCard>
          <SectionCard title="Rückruf / Termin planen">
            <FollowUpScheduler leadId={lead.id} initialWhen={lead.nextFollowUpAt} />
          </SectionCard>
          <SectionCard title="Agenturtermin-Status">
            <p className="mb-3 text-sm text-ink-soft">
              Status des Agenturtermins setzen. Datum oben über „Rückruf / Termin
              planen“.
            </p>
            <LeadStageSelect
              leadId={lead.id}
              current={lead.status}
              options={APPOINTMENT_STAGES}
              reason="Agenturtermin-Status (Bewerberakte)"
            />
          </SectionCard>
        </div>
      ),
    },
    {
      id: "bildungsgutschein",
      label: "Bildungsgutschein",
      content: (
        <div className="space-y-4">
          <SectionCard title="Förderstatus (Bildungsgutschein)">
            <p className="mb-3 text-sm text-ink-soft">
              Aktueller Förderstand:{" "}
              <span className="font-semibold text-navy-950">
                {FUNDING_STATUS_LABEL[fundingStatus]}
              </span>
              . Auswahl wird sofort gespeichert.
            </p>
            <FundingStatusSelect leadId={lead.id} current={fundingStatus} />
          </SectionCard>
          {hasAgency ? <AgenturCard lead={lead} /> : null}
          <DocumentsCard documents={data.documents} />
        </div>
      ),
    },
    {
      id: "timeline",
      label: "Timeline",
      content: (
        <div className="space-y-6">
          <SectionCard title="Ereignis-Chronik">
            <LeadTimelinePanel events={timeline} />
          </SectionCard>
          <StatusHistoryCard history={data.statusHistory} />
        </div>
      ),
    },
  ];

  const leftRail = (
    <LeadProfileRail lead={lead} ownerName={ownerName} lastContactAt={lastContactAt} />
  );

  const rightRail = (
    <ProcessingPanel
      lead={lead}
      calls={data.callLogs}
      assignees={assignees}
      canAssign={canAssign}
      currentUser={currentUser}
    />
  );

  const progress = <BewerberReise lead={lead} history={data.statusHistory} />;

  return (
    <LeadWorkspace
      lead={lead}
      tabs={tabs}
      leftRail={leftRail}
      rightRail={rightRail}
      progress={progress}
      nextAction={nextAction}
    />
  );
}
