import type { AutomationLogEntry } from "./automation/types";
import type {
  AuditLogEntry,
  CallLogEntry,
  CommunicationEntry,
  ConsentState,
  DocumentEntry,
  EligibilityAnswerEntry,
  LeadDetail,
  NoteEntry,
  StatusHistoryEntry,
  UploadedFileEntry,
} from "./types";

export interface LeadFullDetail {
  lead: LeadDetail;
  statusHistory: StatusHistoryEntry[];
  notes: NoteEntry[];
  documents: DocumentEntry[];
  uploadedFiles: UploadedFileEntry[];
  communications: CommunicationEntry[];
  eligibilityAnswers: EligibilityAnswerEntry[];
  consents: ConsentState[];
  automationLogs: AutomationLogEntry[];
  callLogs: CallLogEntry[];
  /** Recent audit entries scoped to this lead — drives the activity timeline. */
  auditLog: AuditLogEntry[];
}
