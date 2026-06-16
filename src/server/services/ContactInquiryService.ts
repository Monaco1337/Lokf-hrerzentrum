/**
 * ContactInquiryService - thin orchestration around the
 * ContactInquiryRepository.
 *
 * Responsibilities:
 *   - hash the request IP (DSGVO: never store raw IPs)
 *   - throttle obvious abuse via short per-email and per-IP windows
 *   - normalize empty optional fields
 *   - emit a CRM-side audit log entry
 */
import { createHash } from "node:crypto";

import {
  AuditAction,
  type ContactInquiryStatus,
} from "@/features/fairtrain-funnel/types";

import { RateLimitedError } from "../errors";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import {
  contactInquiryRepository,
  type ContactInquiryRow,
} from "../repositories/ContactInquiryRepository";

export interface SubmitContactInquiryInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  message: string;
  source: string | null;
  utm: string | null;
  ip: string | null;
  userAgent: string | null;
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

const RATE_WINDOW_MINUTES = 5;
const MAX_PER_EMAIL_IN_WINDOW = 3;
const MAX_PER_IP_IN_WINDOW = 6;

export class ContactInquiryService {
  async submit(input: SubmitContactInquiryInput): Promise<ContactInquiryRow> {
    const ipHash = input.ip ? hashIp(input.ip) : null;

    const fromEmail = await contactInquiryRepository.recentByEmail(
      input.email,
      RATE_WINDOW_MINUTES,
    );
    if (fromEmail >= MAX_PER_EMAIL_IN_WINDOW) {
      throw new RateLimitedError(
        "Zu viele Anfragen mit dieser E-Mail. Bitte später erneut versuchen.",
      );
    }
    if (ipHash) {
      const fromIp = await contactInquiryRepository.recentByIpHash(
        ipHash,
        RATE_WINDOW_MINUTES,
      );
      if (fromIp >= MAX_PER_IP_IN_WINDOW) {
        throw new RateLimitedError(
          "Zu viele Anfragen — bitte später erneut versuchen.",
        );
      }
    }

    const created = await contactInquiryRepository.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      message: input.message,
      source: input.source,
      utm: input.utm,
      ipHash,
      userAgent: input.userAgent,
    });

    await auditLogRepository.append({
      actor: "public",
      action: AuditAction.CONTACT_INQUIRY_CREATED,
      entityType: "ContactInquiry",
      entityId: created.id,
      details: JSON.stringify({ email: input.email, source: input.source }),
    });

    return created;
  }

  async list(limit = 100): Promise<ContactInquiryRow[]> {
    return contactInquiryRepository.list(limit);
  }

  async findById(id: string): Promise<ContactInquiryRow | null> {
    return contactInquiryRepository.findById(id);
  }

  async updateStatus(
    id: string,
    status: ContactInquiryStatus,
    actor: string,
  ): Promise<ContactInquiryRow> {
    const row = await contactInquiryRepository.updateStatus(id, status, actor);
    await auditLogRepository.append({
      actor,
      action: AuditAction.CONTACT_INQUIRY_UPDATED,
      entityType: "ContactInquiry",
      entityId: id,
      details: JSON.stringify({ status }),
    });
    return row;
  }

  async countNew(): Promise<number> {
    return contactInquiryRepository.countNew();
  }

  async delete(id: string, actor: string): Promise<void> {
    const found = await contactInquiryRepository.findById(id);
    await contactInquiryRepository.delete(id);
    await auditLogRepository.append({
      actor,
      action: AuditAction.CONTACT_INQUIRY_DELETED,
      entityType: "ContactInquiry",
      entityId: id,
      details: found ? JSON.stringify({ email: found.email }) : null,
    });
  }
}

export const contactInquiryService = new ContactInquiryService();
