import type {
  AutomationTemplateEntry,
  LeadFullDetail,
  TaskSummary,
  UserSummary,
} from "../types";
import { LeadStatus } from "../types";
import { can } from "../auth/permissions";

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
import {
  LeadAutomationSection,
  LeadConsentSection,
} from "./LeadDetailAutomation";
import { LeadUploadedFiles } from "./LeadUploadedFiles";
import { MagicLinkPanel } from "./MagicLinkPanel";
import { NextStep } from "./NextStep";
import { NotesPanel } from "./NotesPanel";
import { buildTimeline } from "./sales/ActivityTimeline";
import { CallLogPanel } from "./sales/CallLogPanel";
import { buildCopilotRecommendation } from "./sales/copilotHeuristics";
import { LeadCopilotPanel } from "./sales/LeadCopilotPanel";
import { ProcessingPanel } from "./sales/ProcessingPanel";
import { SensitiveRevealToggle } from "./SensitiveRevealToggle";
import { LeadCommunicationLedger } from "./workspace/LeadCommunicationLedger";
import {
  LeadMessagingPanel,
  type OutboundMessageRef,
  type TemplateOption,
} from "./workspace/LeadMessagingPanel";
import { LeadDocumentChecklist } from "./workspace/LeadDocumentChecklist";
import { PortalDocumentReview } from "./workspace/PortalDocumentReview";
import { PortalLinkPanel } from "./workspace/PortalLinkPanel";
import { LeadTasksPanel } from "./workspace/LeadTasksPanel";
import { LeadTimelinePanel } from "./workspace/LeadTimelinePanel";
import { LeadProfileRail } from "./workspace/LeadProfileRail";
import { LeadWorkspace, type WorkspaceTab } from "./workspace/LeadWorkspace";

const FUNDING_STAGES: ReadonlyArray<StageOption> = [
  { value: LeadStatus.CONTACTED, label: "Nicht besprochen" },
  { value: LeadStatus.QUALIFIED, label: "Geeignet" },
  { value: LeadStatus.DOC_READY, label: "Antrag vorbereitet" },
  { value: LeadStatus.AA_APPOINTMENT_PENDING, label: "Agenturtermin offen" },
  { value: LeadStatus.GUTSCHEIN_PENDING, label: "Beantragt" },
  { value: LeadStatus.GUTSCHEIN_APPROVED, label: "Bewilligt" },
];

const APPOINTMENT_STAGES: ReadonlyArray<StageOption> = [
  { value: LeadStatus.AA_APPOINTMENT_PENDING, label: "Termin geplant" },
  { value: LeadStatus.AA_APPOINTMENT_DONE, label: "Termin bestätigt/erledigt" },
];

export function LeadDetail({
  data,
  automationTemplates,
  currentUser,
  assignees,
  tasks,
  whatsappLive = false,
}: {
  data: LeadFullDetail;
  automationTemplates: AutomationTemplateEntry[];
  currentUser: UserSummary;
  assignees: ReadonlyArray<UserSummary>;
  tasks: ReadonlyArray<TaskSummary>;
  whatsappLive?: boolean;
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
    data.automationLogs.filter((l) => l.status === "SENT" && !l.isTest).map((l) => l.channel),
  );
  const emailSent = sentChannels.has("EMAIL");
  const whatsappSent = sentChannels.has("WHATSAPP");

  const messageTemplates: TemplateOption[] = automationTemplates
    .filter((t) => t.enabled && t.status === "active")
    .map((t) => ({
      id: t.id,
      name: t.name,
      channel: t.channel,
      category: t.category,
      body: t.body,
      approvalStatus: t.metaApprovalStatus,
    }));
  const outboundMessages: OutboundMessageRef[] = data.communications
    .filter((c) => c.direction === "OUT")
    .slice(0, 6)
    .map((c) => ({
      id: c.id,
      body: c.payload,
      channel: c.channel,
      status: c.status,
    }));

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

  const openTasks = tasks.filter((t) => t.status !== "DONE").length;

  const tabs: WorkspaceTab[] = [
    {
      id: "uebersicht",
      label: "Übersicht",
      content: (
        <div className="space-y-6">
          <StammdatenCard lead={lead} />
          {hasAgency ? <AgenturCard lead={lead} /> : null}
          {hasCv ? <LebenslaufCard lead={lead} /> : null}
          <EligibilityCard answers={data.eligibilityAnswers} />
          <SectionCard title="Sensible Angaben">
            <p className="text-sm text-ink-soft">
              Werden nur auf Anforderung angezeigt. Jeder Aufruf wird protokolliert.
            </p>
            <div className="mt-4">
              <SensitiveRevealToggle leadId={lead.id} />
            </div>
          </SectionCard>
        </div>
      ),
    },
    {
      id: "kommunikation",
      label: "Kommunikation",
      content: (
        <div className="space-y-6">
          <SectionCard title="Nachricht senden / simulieren">
            <LeadMessagingPanel
              leadId={lead.id}
              templates={messageTemplates}
              outbound={outboundMessages}
              whatsappLive={whatsappLive}
            />
          </SectionCard>
          <SectionCard title="Konversationsverlauf">
            <LeadCommunicationLedger
              communications={data.communications}
              automationLogs={data.automationLogs}
              callLogs={data.callLogs}
            />
          </SectionCard>
          <SectionCard title="Anruf protokollieren">
            <CallLogPanel leadId={lead.id} initial={data.callLogs} canTrack={canTrack} />
          </SectionCard>
          <SectionCard title="Magic-Link senden">
            <MagicLinkPanel leadId={lead.id} />
          </SectionCard>
          <LeadAutomationSection
            leadId={lead.id}
            logs={data.automationLogs}
            templates={automationTemplates}
          />
          <LeadConsentSection consents={data.consents} />
        </div>
      ),
    },
    {
      id: "unterlagen",
      label: "Unterlagen",
      content: (
        <div className="space-y-6">
          <SectionCard title="Bewerberportal – Unterlagenprüfung">
            <PortalDocumentReview leadId={lead.id} documents={data.portalDocuments} />
          </SectionCard>
          <SectionCard title="Dokumenten-Checkliste">
            <LeadDocumentChecklist
              uploadedFiles={data.uploadedFiles}
              documents={data.documents}
            />
          </SectionCard>
          <SectionCard title="Bewerberportal-Link">
            <PortalLinkPanel leadId={lead.id} link={data.portalLink} />
          </SectionCard>
          <SectionCard title="Hochgeladene Dateien">
            <LeadUploadedFiles files={data.uploadedFiles} />
          </SectionCard>
          <SectionCard title="Vorlage senden / Magic-Link">
            <MagicLinkPanel leadId={lead.id} />
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
        <div className="space-y-6">
          <SectionCard title="Follow-up / Termin planen">
            <FollowUpScheduler leadId={lead.id} initialWhen={lead.nextFollowUpAt} />
          </SectionCard>
          <SectionCard title="Agenturtermin-Status">
            <p className="mb-3 text-sm text-ink-soft">
              Status des Agenturtermins setzen. Datum oben über Follow-up planen.
            </p>
            <LeadStageSelect
              leadId={lead.id}
              current={lead.status}
              options={APPOINTMENT_STAGES}
              reason="Agenturtermin-Status (Bewerberakte)"
            />
          </SectionCard>
          <SectionCard title="Anruf / Rückruf protokollieren">
            <CallLogPanel leadId={lead.id} initial={data.callLogs} canTrack={canTrack} />
          </SectionCard>
        </div>
      ),
    },
    {
      id: "bildungsgutschein",
      label: "Bildungsgutschein",
      content: (
        <div className="space-y-6">
          <SectionCard title="Förderstatus">
            <p className="mb-3 text-sm text-ink-soft">
              Bildungsgutschein-Stufe aktualisieren. Änderungen werden protokolliert.
            </p>
            <LeadStageSelect
              leadId={lead.id}
              current={lead.status}
              options={FUNDING_STAGES}
              reason="Förderstatus (Bewerberakte)"
            />
          </SectionCard>
          {hasAgency ? <AgenturCard lead={lead} /> : null}
          <DocumentsCard documents={data.documents} />
          <SectionCard title="Notizen zur Förderung">
            <NotesPanel leadId={lead.id} initialNotes={data.notes} />
          </SectionCard>
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
    {
      id: "notizen",
      label: "Notizen",
      content: (
        <SectionCard title="Interne Notizen">
          <NotesPanel leadId={lead.id} initialNotes={data.notes} />
        </SectionCard>
      ),
    },
  ];

  const leftRail = (
    <LeadProfileRail lead={lead} ownerName={ownerName} lastContactAt={lastContactAt} />
  );

  const rightRail = (
    <>
      <LeadCopilotPanel rec={copilot} />
      <NextStep
        leadId={lead.id}
        currentStatus={lead.status}
        emailSent={emailSent}
        whatsappSent={whatsappSent}
      />
      <ProcessingPanel
        lead={lead}
        calls={data.callLogs}
        assignees={assignees}
        canAssign={canAssign}
        currentUser={currentUser}
      />
    </>
  );

  const progress = <BewerberReise lead={lead} history={data.statusHistory} />;

  return (
    <LeadWorkspace
      lead={lead}
      tabs={tabs}
      leftRail={leftRail}
      rightRail={rightRail}
      progress={progress}
    />
  );
}
