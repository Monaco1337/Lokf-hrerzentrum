/**
 * Applicant portal domain types — link lifecycle, document checklist and the
 * self-service form contract. Kept framework-free so both server and client
 * (public portal + CRM admin) can import them.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Portal link status.
// ---------------------------------------------------------------------------
export const PortalLinkStatus = {
  ACTIVE: "ACTIVE",
  OPENED: "OPENED",
  COMPLETED: "COMPLETED",
  DISABLED: "DISABLED",
} as const;
export type PortalLinkStatus =
  (typeof PortalLinkStatus)[keyof typeof PortalLinkStatus];
export const PortalLinkStatusSchema = z.enum([
  "ACTIVE",
  "OPENED",
  "COMPLETED",
  "DISABLED",
]);

/** Includes the derived EXPIRED state used only for display. */
export type PortalLinkDisplayStatus = PortalLinkStatus | "EXPIRED";
export const PORTAL_LINK_STATUS_LABEL: Record<PortalLinkDisplayStatus, string> = {
  ACTIVE: "Aktiv",
  OPENED: "Geöffnet",
  COMPLETED: "Abgeschlossen",
  DISABLED: "Deaktiviert",
  EXPIRED: "Abgelaufen",
};

// ---------------------------------------------------------------------------
// Document checklist.
// ---------------------------------------------------------------------------
export const PortalDocumentKind = {
  LEBENSLAUF: "LEBENSLAUF",
  AUSWEIS: "AUSWEIS",
  FUEHRERSCHEIN: "FUEHRERSCHEIN",
  ZEUGNISSE: "ZEUGNISSE",
  BILDUNGSGUTSCHEIN: "BILDUNGSGUTSCHEIN",
  SONSTIGES: "SONSTIGES",
} as const;
export type PortalDocumentKind =
  (typeof PortalDocumentKind)[keyof typeof PortalDocumentKind];
export const PortalDocumentKindSchema = z.enum([
  "LEBENSLAUF",
  "AUSWEIS",
  "FUEHRERSCHEIN",
  "ZEUGNISSE",
  "BILDUNGSGUTSCHEIN",
  "SONSTIGES",
]);

export const PORTAL_DOCUMENT_LABEL: Record<PortalDocumentKind, string> = {
  LEBENSLAUF: "Lebenslauf",
  AUSWEIS: "Ausweis",
  FUEHRERSCHEIN: "Führerschein",
  ZEUGNISSE: "Zeugnisse",
  BILDUNGSGUTSCHEIN: "Bildungsgutschein",
  SONSTIGES: "Weitere Nachweise",
};

/** Ordered checklist used everywhere the documents are rendered. */
export const PORTAL_DOCUMENT_ORDER: ReadonlyArray<PortalDocumentKind> = [
  "LEBENSLAUF",
  "AUSWEIS",
  "FUEHRERSCHEIN",
  "ZEUGNISSE",
  "BILDUNGSGUTSCHEIN",
  "SONSTIGES",
];

/** Documents that count towards completion (SONSTIGES is optional). */
export const PORTAL_REQUIRED_DOCUMENTS: ReadonlyArray<PortalDocumentKind> = [
  "LEBENSLAUF",
  "AUSWEIS",
  "FUEHRERSCHEIN",
  "BILDUNGSGUTSCHEIN",
];

export const PortalDocumentStatus = {
  MISSING: "MISSING",
  REQUESTED: "REQUESTED",
  UPLOADED: "UPLOADED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type PortalDocumentStatus =
  (typeof PortalDocumentStatus)[keyof typeof PortalDocumentStatus];
export const PortalDocumentStatusSchema = z.enum([
  "MISSING",
  "REQUESTED",
  "UPLOADED",
  "APPROVED",
  "REJECTED",
]);
export const PORTAL_DOCUMENT_STATUS_LABEL: Record<PortalDocumentStatus, string> = {
  MISSING: "Fehlt",
  REQUESTED: "Angefordert",
  UPLOADED: "Hochgeladen",
  APPROVED: "Freigegeben",
  REJECTED: "Abgelehnt",
};

// ---------------------------------------------------------------------------
// Self-service form contract.
// ---------------------------------------------------------------------------
export const PortalFormSchema = z.object({
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().max(160).optional(),
  city: z.string().max(120).optional(),
  availability: z.string().max(200).optional(),
  currentEmploymentStatus: z.string().max(60).optional(),
  agencyStatus: z.string().max(120).optional(),
  hasEducationVoucher: z.boolean().optional(),
  hasDrivingLicense: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});
export type PortalFormValues = z.infer<typeof PortalFormSchema>;

// ---------------------------------------------------------------------------
// Entry / view types.
// ---------------------------------------------------------------------------
export interface PortalLinkEntry {
  id: string;
  leadId: string;
  status: PortalLinkStatus;
  displayStatus: PortalLinkDisplayStatus;
  expiresAt: Date;
  openedAt: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortalDocumentEntry {
  id: string;
  leadId: string;
  kind: PortalDocumentKind;
  status: PortalDocumentStatus;
  fileName: string | null;
  reviewerNote: string | null;
  uploadedAt: Date | null;
  reviewedAt: Date | null;
  isDemo: boolean;
}

/** Minimal, applicant-safe view returned to the public portal page. */
export interface PortalContext {
  ok: boolean;
  reason?: "INVALID" | "EXPIRED" | "DISABLED";
  displayStatus?: PortalLinkDisplayStatus;
  isDemo?: boolean;
  companyName?: string;
  form?: PortalFormValues;
  documents?: Array<{
    kind: PortalDocumentKind;
    label: string;
    status: PortalDocumentStatus;
    required: boolean;
  }>;
  completionPercent?: number;
}
