/**
 * Integration test for MagicLinkTokenService.
 *
 * Uses a dedicated SQLite test database. The schema is applied via
 * `prisma db push --force-reset` before the suite runs.
 */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const TEST_DB_PATH = join(process.cwd(), "prisma", "test.db");
const TEST_DB_URL = `file:./test.db`;

(process.env as Record<string, string>)["DATABASE_URL"] = TEST_DB_URL;
(process.env as Record<string, string>)["TOKEN_PEPPER"] = "test-pepper";
(process.env as Record<string, string>)["APP_BASE_URL"] = "http://localhost:3000";
(process.env as Record<string, string>)["NODE_ENV"] = "test";

describe("MagicLinkTokenService", () => {
  beforeAll(() => {
    try {
      rmSync(TEST_DB_PATH, { force: true });
    } catch {
      /* ignore */
    }
    execSync("npx prisma db push --skip-generate --force-reset", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    });
  });

  afterAll(async () => {
    const { prisma } = await import("@/server/db/prisma");
    await prisma.$disconnect();
    try {
      rmSync(TEST_DB_PATH, { force: true });
    } catch {
      /* ignore */
    }
  });

  beforeEach(async () => {
    const { prisma } = await import("@/server/db/prisma");
    await prisma.magicLinkToken.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.sensitiveAnswers.deleteMany({});
    await prisma.lead.deleteMany({});
  });

  async function makeLead(): Promise<string> {
    const { prisma } = await import("@/server/db/prisma");
    const lead = await prisma.lead.create({
      data: {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        phone: "+49 000",
        funnelPath: "UNEMPLOYED",
        employmentStatus: "UNEMPLOYED",
        preferredLocation: "BERLIN",
        acceptsShiftWork: true,
        score: 80,
        priority: "HOT",
        status: "QUALIFIED",
      },
    });
    return lead.id;
  }

  it("creates a token, returns plaintext once, stores only a hash", async () => {
    const { magicLinkTokenService } = await import(
      "@/server/services/MagicLinkTokenService"
    );
    const { prisma } = await import("@/server/db/prisma");

    const leadId = await makeLead();
    const created = await magicLinkTokenService.create(
      leadId,
      "COMPLETE_PROFILE",
      "admin",
      60,
    );

    expect(created.token.length).toBeGreaterThan(32);
    expect(created.url).toContain("/m/");

    const rows = await prisma.magicLinkToken.findMany({});
    expect(rows.length).toBe(1);
    expect(rows[0]?.tokenHash).not.toContain(created.token);
    expect(rows[0]?.tokenHash.length).toBe(64); // sha256 hex
  });

  it("consumes a valid token exactly once", async () => {
    const { magicLinkTokenService } = await import(
      "@/server/services/MagicLinkTokenService"
    );
    const leadId = await makeLead();
    const { token } = await magicLinkTokenService.create(
      leadId,
      "COMPLETE_PROFILE",
      "admin",
      60,
    );

    const first = await magicLinkTokenService.consume(token);
    expect(first.leadId).toBe(leadId);

    await expect(magicLinkTokenService.consume(token)).rejects.toMatchObject({
      code: "TOKEN_USED",
    });
  });

  it("rejects an unknown token as INVALID", async () => {
    const { magicLinkTokenService } = await import(
      "@/server/services/MagicLinkTokenService"
    );
    await expect(
      magicLinkTokenService.consume("a".repeat(40)),
    ).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });

  it("rejects an expired token as EXPIRED", async () => {
    const { magicLinkTokenService } = await import(
      "@/server/services/MagicLinkTokenService"
    );
    const { prisma } = await import("@/server/db/prisma");

    const leadId = await makeLead();
    const { token } = await magicLinkTokenService.create(
      leadId,
      "COMPLETE_PROFILE",
      "admin",
      60,
    );
    // Force expiry directly via the repository surface (allowed in tests).
    await prisma.magicLinkToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(magicLinkTokenService.consume(token)).rejects.toMatchObject({
      code: "TOKEN_EXPIRED",
    });
  });
});
