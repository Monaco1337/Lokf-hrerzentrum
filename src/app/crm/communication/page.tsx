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
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Kommunikation
        </p>
        <h1 className="mt-1 font-display text-[28px] font-bold tracking-tight text-navy-950">
          Nachrichtenzentrale
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-muted">
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
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
    amber: "text-amber-600",
  }[tone];
  const ring = {
    emerald: "ring-emerald-100",
    blue: "ring-blue-100",
    orange: "ring-orange-100",
    amber: "ring-amber-100",
  }[tone];
  return (
    <li>
      <Link
        href={href}
        className={[
          "block rounded-2xl border border-ink/[0.07] bg-white/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl backdrop-saturate-150 transition duration-200 supports-[backdrop-filter]:bg-white/70",
          "hover:-translate-y-0.5 hover:border-ink/15 hover:bg-white hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.18),0_4px_10px_-4px_rgba(15,23,42,0.08)]",
          "ring-1 ring-inset",
          ring,
        ].join(" ")}
      >
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          {eyebrow}
        </p>
        <p className="mt-1 text-[15px] font-semibold text-navy-950">{title}</p>
        <p className={`mt-2 text-[28px] font-bold leading-none tabular-nums ${accent}`}>
          {metric}
        </p>
        <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>
      </Link>
    </li>
  );
}
