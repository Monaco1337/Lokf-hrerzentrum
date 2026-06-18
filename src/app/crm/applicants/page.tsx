/**
 * /crm/applicants — Bewerberportal-Übersicht für den Operator.
 *
 * Zeigt Bewerberlink-Aktivität, Self-Service-Auslastung und welche Bewerber
 * aktuell Portal-Zugang haben — echte Daten aus MagicLinkToken + Lead.
 */
import Link from "next/link";
import type { Route } from "next";

import {
  PORTAL_LINK_STATUS_LABEL,
  PORTAL_REQUIRED_DOCUMENTS,
} from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { prisma } from "@/server/db/prisma";
import { deriveDisplayStatus } from "@/server/repositories/PortalLinkRepository";
import type { PortalLinkStatus } from "@/features/fairtrain-funnel/types";

export const dynamic = "force-dynamic";

const DT_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function BewerberportalPage() {
  await requireCrmUser();
  const now = new Date();
  const last7 = new Date(Date.now() - 7 * 86400000);

  const [activeTokens, recentUsed, recentlyIssued, leadsWithUploads] =
    await Promise.all([
      prisma.magicLinkToken.findMany({
        where: { expiresAt: { gt: now } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, city: true, status: true },
          },
        },
      }),
      prisma.magicLinkToken.count({
        where: { usedAt: { gte: last7 } },
      }),
      prisma.magicLinkToken.count({
        where: { createdAt: { gte: last7 } },
      }),
      prisma.uploadedFile.groupBy({
        by: ["leadId"],
        where: { uploadedAt: { gte: last7 }, leadId: { not: null } },
        _count: { _all: true },
      }),
    ]);

  const expiredCount = await prisma.magicLinkToken.count({
    where: { expiresAt: { lt: now } },
  });

  const usedTokenCount = activeTokens.filter((t) => t.usedAt).length;
  const unusedTokenCount = activeTokens.length - usedTokenCount;

  // Self-service portal (PortalLink) overview with document completion.
  const portalLinks = await prisma.portalLink.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, city: true, status: true },
      },
    },
  });
  const portalLeadIds = portalLinks.map((l) => l.leadId);
  const portalDocs = portalLeadIds.length
    ? await prisma.portalDocument.findMany({
        where: { leadId: { in: portalLeadIds } },
      })
    : [];
  const completionByLead = new Map<string, number>();
  for (const id of portalLeadIds) {
    const done = PORTAL_REQUIRED_DOCUMENTS.filter((k) =>
      portalDocs.some(
        (d) =>
          d.leadId === id &&
          d.kind === k &&
          (d.status === "UPLOADED" || d.status === "APPROVED"),
      ),
    ).length;
    completionByLead.set(
      id,
      Math.round((done / PORTAL_REQUIRED_DOCUMENTS.length) * 100),
    );
  }
  const completedPortals = portalLinks.filter(
    (l) => l.status === "COMPLETED",
  ).length;

  return (
    <div className="space-y-5">
      <header>
        <p className="ops-eyebrow">Bewerberportal</p>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
          Self-Service-Übersicht
        </h1>
        <p className="mt-1 max-w-2xl text-[12.5px] text-zinc-400">
          Persönliche Bewerberlinks: aktive Zugänge, eingelöste Logins,
          Upload-Aktivität.
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Aktive Bewerberlinks" value={activeTokens.length} tone="emerald" />
        <Kpi label="Eingelöst (7T)" value={recentUsed} tone="emerald" />
        <Kpi label="Ausgegeben (7T)" value={recentlyIssued} tone="blue" />
        <Kpi
          label="Ungenutzte"
          value={unusedTokenCount}
          tone={unusedTokenCount > 0 ? "amber" : "slate"}
        />
      </ul>

      <section className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4">
        <header className="mb-2 flex items-end justify-between">
          <div>
            <p className="ops-eyebrow">Bewerberportal-Self-Service</p>
            <p className="text-[12.5px] text-zinc-400">
              {portalLinks.length} Portal-Links · {completedPortals} abgeschlossen
            </p>
          </div>
        </header>
        {portalLinks.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-zinc-500">
            Noch keine Bewerberportal-Links erzeugt. Lege im Lead-Detail einen Link an.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {portalLinks.map((l) => {
              const display = deriveDisplayStatus(
                l.status as PortalLinkStatus,
                l.expiresAt,
              );
              const pct = completionByLead.get(l.leadId) ?? 0;
              return (
                <li key={l.id}>
                  <Link
                    href={`/crm/leads/${l.lead.id}` as Route}
                    className="flex items-center gap-3 px-1 py-2.5 transition hover:bg-white/[0.04]"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-400 text-[11px] font-bold text-black">
                      {`${l.lead.firstName[0] ?? ""}${l.lead.lastName[0] ?? ""}`.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[12.5px] font-semibold text-white">
                          {l.lead.firstName} {l.lead.lastName}
                        </p>
                        <p className="shrink-0 text-[10.5px] tabular-nums text-zinc-500">
                          Unterlagen {pct}%
                        </p>
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-zinc-500">
                        {l.lead.city ?? "—"} · {l.lead.status}
                      </p>
                    </div>
                    <span className="ml-2 shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-zinc-300">
                      {PORTAL_LINK_STATUS_LABEL[display]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4">
        <header className="mb-2 flex items-end justify-between">
          <div>
            <p className="ops-eyebrow">Aktive Bewerberlinks</p>
            <p className="text-[12.5px] text-zinc-400">
              {activeTokens.length} Bewerber haben aktuell einen gültigen Self-Service-Zugang
            </p>
          </div>
          <p className="text-[10.5px] text-zinc-600">
            {expiredCount} abgelaufen insgesamt
          </p>
        </header>

        {activeTokens.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-zinc-500">
            Aktuell keine aktiven Portal-Zugänge.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {activeTokens.map((t) => {
              const uploadsByLead = leadsWithUploads.find(
                (u) => u.leadId === t.lead.id,
              );
              return (
                <li key={t.id}>
                  <Link
                    href={`/crm/leads/${t.lead.id}` as Route}
                    className="flex items-center gap-3 px-1 py-2.5 transition hover:bg-white/[0.04]"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[11px] font-bold text-black">
                      {`${t.lead.firstName[0] ?? ""}${t.lead.lastName[0] ?? ""}`.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[12.5px] font-semibold text-white">
                          {t.lead.firstName} {t.lead.lastName}
                        </p>
                        <p className="shrink-0 text-[10.5px] tabular-nums text-zinc-500">
                          gültig bis {DT_FMT.format(t.expiresAt)}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-zinc-500">
                        {t.lead.city ?? "—"} · {t.lead.status} ·{" "}
                        {t.scope}
                        {uploadsByLead && (
                          <span className="ml-2 text-emerald-300">
                            {uploadsByLead._count._all} Uploads (7T)
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${
                        t.usedAt
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {t.usedAt ? "eingelöst" : "wartet"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "emerald" | "orange" | "amber" | "slate";
}) {
  const accent = {
    blue: "text-blue-300",
    emerald: "text-emerald-300",
    orange: "text-orange-300",
    amber: "text-amber-300",
    slate: "text-zinc-300",
  }[tone];
  return (
    <li className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-3.5">
      <p className="ops-eyebrow">{label}</p>
      <p className={`mt-1 text-[24px] font-bold leading-none tabular-nums ${accent}`}>
        {value}
      </p>
    </li>
  );
}
