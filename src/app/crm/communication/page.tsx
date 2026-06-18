/**
 * /crm/communication — Kommunikations-Center Übersicht.
 *
 * Hub mit den 4 Brief-Modulen (WhatsApp · E-Mail · Vorlagen · Versandhistorie)
 * plus Live-Kennzahlen pro Kanal aus echten CommunicationEvent-/AutomationLog-Daten.
 */
import Link from "next/link";
import type { Route } from "next";

import {
  CommunicationChannel,
  MessageSentBySchema,
  MessageStatusSchema,
} from "@/features/fairtrain-funnel/types";
import {
  CommunicationHub,
  type HubMessage,
} from "@/features/fairtrain-funnel/crm/communication/CommunicationHub";
import { requireCrmUser } from "@/server/actions/_helpers";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function CommunicationCenterPage() {
  await requireCrmUser();
  const since24h = new Date(Date.now() - 24 * 3_600_000);

  const [byChannel, recent, automationCount, templateCount] = await Promise.all([
    prisma.communicationEvent.groupBy({
      by: ["channel", "direction"],
      _count: { _all: true },
    }),
    prisma.communicationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.automationLog.count({
      where: { createdAt: { gte: since24h } },
    }),
    prisma.automationTemplate.count(),
  ]);

  const hubMessages: HubMessage[] = recent.map((m) => ({
    id: m.id,
    leadId: m.lead.id,
    leadName: `${m.lead.firstName} ${m.lead.lastName}`.trim() || "Unbekannt",
    channel: m.channel,
    direction: m.direction === "IN" ? "IN" : "OUT",
    type: m.type,
    status: MessageStatusSchema.catch("SENT").parse(m.status),
    sentBy: MessageSentBySchema.catch("SYSTEM").parse(m.sentBy),
    body: m.payload,
    templateName: m.templateName,
    isDemo: m.isDemo,
    failedReason: m.failedReason,
    createdAt: m.createdAt.toISOString(),
  }));

  // Aggregate channel counts
  const channelStats = new Map<string, { out: number; in: number }>();
  for (const r of byChannel) {
    const cur = channelStats.get(r.channel) ?? { out: 0, in: 0 };
    if (r.direction === "OUT") cur.out += r._count._all;
    else cur.in += r._count._all;
    channelStats.set(r.channel, cur);
  }
  const wa = channelStats.get(CommunicationChannel.WHATSAPP) ?? { out: 0, in: 0 };
  const em = channelStats.get(CommunicationChannel.EMAIL) ?? { out: 0, in: 0 };

  return (
    <div className="space-y-5">
      <header>
        <p className="ops-eyebrow">Kommunikation</p>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
          Nachrichtenzentrale
        </h1>
        <p className="mt-1 max-w-2xl text-[12.5px] text-zinc-400">
          Alle Lead-bezogene Kommunikation in einem Center: WhatsApp,
          E-Mail, Vorlagen, Versandhistorie.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ModuleCard
          eyebrow="WhatsApp"
          title="Postfach"
          metric={`${wa.in + wa.out}`}
          hint={`${wa.in} eingehend · ${wa.out} ausgehend`}
          href={"/crm/communication/whatsapp" as Route}
          tone="emerald"
        />
        <ModuleCard
          eyebrow="E-Mail"
          title="Postfach"
          metric={`${em.in + em.out}`}
          hint={`${em.in} eingehend · ${em.out} ausgehend`}
          href={"/crm/communication/email" as Route}
          tone="blue"
        />
        <ModuleCard
          eyebrow="Vorlagen"
          title="Templates"
          metric={`${templateCount}`}
          hint="Versandbausteine"
          href={"/crm/automation" as Route}
          tone="orange"
        />
        <ModuleCard
          eyebrow="Versandhistorie"
          title="Live-Log"
          metric={`${automationCount}`}
          hint="Versand-Aktionen (24h)"
          href={"/crm/communication/log" as Route}
          tone="amber"
        />
      </ul>

      <CommunicationHub messages={hubMessages} />
    </div>
  );
}

function ModuleCard({
  eyebrow,
  title,
  metric,
  hint,
  href,
  tone,
}: {
  eyebrow: string;
  title: string;
  metric: string;
  hint: string;
  href: Route;
  tone: "emerald" | "blue" | "orange" | "amber";
}) {
  const accent = {
    emerald: "text-emerald-300",
    blue: "text-blue-300",
    orange: "text-orange-300",
    amber: "text-amber-300",
  }[tone];
  return (
    <li>
      <Link
        href={href}
        className="block rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4 transition hover:border-white/[0.16] hover:bg-[#161618]"
      >
        <p className="ops-eyebrow">{eyebrow}</p>
        <p className="mt-1 text-[15px] font-semibold text-white">{title}</p>
        <p className={`mt-2 text-[26px] font-bold leading-none tabular-nums ${accent}`}>
          {metric}
        </p>
        <p className="mt-1 text-[10.5px] text-zinc-500">{hint}</p>
      </Link>
    </li>
  );
}
