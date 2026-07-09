/**
 * WhatsappEventRepository - append-only ledger of RAW WhatsApp provider events.
 *
 * Its single most important job is IDEMPOTENCY: WhatsApp/Meta re-deliver the
 * same webhook multiple times, so every event is keyed by
 * (providerMessageId, eventType). `recordOnce` returns false when the event has
 * already been seen, letting the caller skip re-processing (no double scoring,
 * no duplicate replies). The raw payload is kept here for debugging and is
 * never copied onto the lead.
 */
import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma";

export interface RecordEventInput {
  provider: string;
  eventType: string;
  providerMessageId: string;
  payload: string;
  leadId?: string | null;
  messageId?: string | null;
}

export class WhatsappEventRepository {
  /**
   * Insert the event once. Returns true if it was newly recorded (caller should
   * process it), false if it was a duplicate (caller should no-op). Relies on
   * the unique (providerMessageId, eventType) index for atomicity.
   */
  async recordOnce(input: RecordEventInput): Promise<boolean> {
    try {
      await prisma.whatsappMessageEvent.create({
        data: {
          provider: input.provider,
          eventType: input.eventType,
          providerMessageId: input.providerMessageId,
          payload: input.payload,
          leadId: input.leadId ?? null,
          messageId: input.messageId ?? null,
        },
      });
      return true;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return false; // duplicate — already processed
      }
      throw err;
    }
  }
}

export const whatsappEventRepository = new WhatsappEventRepository();
