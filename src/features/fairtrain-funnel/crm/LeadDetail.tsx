import Link from "next/link";

import type {
  AutomationTemplateEntry,
  LeadFullDetail,
  UserSummary,
} from "../types";
import { can } from "../auth/permissions";

import { FollowUpScheduler } from "./FollowUpScheduler";
import { BewerberReise } from "./operations/BewerberReise";
import { LeadCommandSummary } from "./operations/LeadCommandSummary";
import {
  AgenturCard,
  DocumentsCard,
  EligibilityCard,
  LebenslaufCard,
  SectionCard,
  StammdatenCard,
  StatusHistoryCard,
} from "./LeadFacts";
import {
  LeadAutomationSection,
  LeadConsentSection,
} from "./LeadDetailAutomation";
import { LeadHeader } from "./LeadHeader";
import { LeadUploadedFiles } from "./LeadUploadedFiles";
import { MagicLinkPanel } from "./MagicLinkPanel";
import { NextStep } from "./NextStep";
import { NotesPanel } from "./NotesPanel";
import {
  ActivityTimeline,
  buildTimeline,
} from "./sales/ActivityTimeline";
import { CallLogPanel } from "./sales/CallLogPanel";
import { buildCopilotRecommendation } from "./sales/copilotHeuristics";
import { LeadCopilotPanel } from "./sales/LeadCopilotPanel";
import { ProcessingPanel } from "./sales/ProcessingPanel";
import { SensitiveRevealToggle } from "./SensitiveRevealToggle";

export function LeadDetail({
  data,
  automationTemplates,
  currentUser,
  assignees,
}: {
  data: LeadFullDetail;
  automationTemplates: AutomationTemplateEntry[];
  currentUser: UserSummary;
  assignees: ReadonlyArray<UserSummary>;
}) {
  const { lead } = data;
  const timeline = buildTimeline({
    audit: data.auditLog,
    calls: data.callLogs,
    statusHistory: data.statusHistory,
  });
  const copilot = buildCopilotRecommendation(data);
  const canAssign = can(currentUser.role, "canAssignLeads");
  const canTrack = can(currentUser.role, "canTrackCalls");

  const sentChannels = new Set(
    data.automationLogs
      .filter((l) => l.status === "SENT" && !l.isTest)
      .map((l) => l.channel),
  );
  const emailSent = sentChannels.has("EMAIL");
  const whatsappSent = sentChannels.has("WHATSAPP");

  const hasCv =
    lead.unemployedSince ||
    lead.careerHistory ||
    lead.schoolEducation ||
    lead.graduationYear ||
    lead.languages ||
    lead.computerSkills ||
    lead.interests;
  const hasAgency =
    lead.agencyCity || lead.agencyCustomerNumber || lead.agencyCaseWorker;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/crm/leads"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Alle Leads
        </Link>
      </div>

      <LeadHeader lead={lead} />

      <LeadCommandSummary
        data={data}
        copilot={copilot}
        assignedToName={
          lead.assignedToId
            ? (assignees.find((a) => a.id === lead.assignedToId)?.name ??
              lead.assignedTo)
            : null
        }
      />

      <ProcessingPanel
        lead={lead}
        calls={data.callLogs}
        assignees={assignees}
        canAssign={canAssign}
        currentUser={currentUser}
      />

      <BewerberReise lead={lead} history={data.statusHistory} />

      {/*
        Workbench 3-column layout:
          left  (4) — Profil & Facts (Stammdaten, Agentur, CV, Eligibility)
          mid   (5) — Operative Spalte (Calls, Timeline, Notizen, Sensitive)
          right (3) — KI Copilot + Quick-Actions + Magic-Link + Statushistorie
      */}
      <div className="grid gap-6 xl:grid-cols-12">
        <aside className="space-y-6 xl:col-span-4">
          <StammdatenCard lead={lead} />
          {hasAgency ? <AgenturCard lead={lead} /> : null}
          {hasCv ? <LebenslaufCard lead={lead} /> : null}
          <EligibilityCard answers={data.eligibilityAnswers} />
          <DocumentsCard documents={data.documents} />
          <SectionCard title="Hochgeladene Dateien">
            <LeadUploadedFiles files={data.uploadedFiles} />
          </SectionCard>
        </aside>

        <section className="space-y-6 xl:col-span-5">
          <SectionCard title="Anrufprotokoll">
            <CallLogPanel
              leadId={lead.id}
              initial={data.callLogs}
              canTrack={canTrack}
            />
          </SectionCard>
          <SectionCard title="Aktivitäten-Timeline">
            <ActivityTimeline events={timeline} />
          </SectionCard>
          <SectionCard title="Notizen">
            <NotesPanel leadId={lead.id} initialNotes={data.notes} />
          </SectionCard>
          <SectionCard title="Sensible Angaben">
            <p className="text-sm text-ink-soft">
              Werden nur auf Anforderung angezeigt. Jeder Aufruf wird
              protokolliert.
            </p>
            <div className="mt-4">
              <SensitiveRevealToggle leadId={lead.id} />
            </div>
          </SectionCard>
          <LeadAutomationSection
            leadId={lead.id}
            logs={data.automationLogs}
            templates={automationTemplates}
          />
          <LeadConsentSection consents={data.consents} />
        </section>

        <aside className="space-y-6 xl:col-span-3">
          <LeadCopilotPanel rec={copilot} />
          <NextStep
            leadId={lead.id}
            currentStatus={lead.status}
            emailSent={emailSent}
            whatsappSent={whatsappSent}
          />
          <SectionCard title="Follow-up">
            <FollowUpScheduler leadId={lead.id} initialWhen={lead.nextFollowUpAt} />
          </SectionCard>
          <SectionCard title="Magic-Link">
            <MagicLinkPanel leadId={lead.id} />
          </SectionCard>
          <StatusHistoryCard history={data.statusHistory} />
        </aside>
      </div>
    </div>
  );
}
