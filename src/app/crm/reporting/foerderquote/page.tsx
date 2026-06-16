import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { LeadStatus } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";

export const dynamic = "force-dynamic";

export default async function FoerderquotePage() {
  const currentUser = await requireCrmUser();
  if (!can(currentUser.role, "canViewAnalytics")) redirect("/crm");

  const leads = await leadRepository.list({});

  const requested = leads.filter(
    (l) =>
      l.status === LeadStatus.GUTSCHEIN_PENDING ||
      l.status === LeadStatus.GUTSCHEIN_APPROVED ||
      l.status === LeadStatus.ENROLLED ||
      l.status === LeadStatus.STARTED ||
      l.status === LeadStatus.CLOSED,
  );
  const approved = leads.filter(
    (l) =>
      l.status === LeadStatus.GUTSCHEIN_APPROVED ||
      l.status === LeadStatus.ENROLLED ||
      l.status === LeadStatus.STARTED ||
      l.status === LeadStatus.CLOSED,
  );

  const quote =
    requested.length === 0 ? 0 : approved.length / requested.length;

  // Recent trend — last 30 days vs prior 30 days approval rate.
  const now = Date.now();
  const inLast30 = (d: Date) => now - d.getTime() < 30 * 86400 * 1000;
  const inPrior30 = (d: Date) =>
    now - d.getTime() >= 30 * 86400 * 1000 &&
    now - d.getTime() < 60 * 86400 * 1000;

  const last30Requested = requested.filter((l) => inLast30(l.updatedAt));
  const last30Approved = last30Requested.filter((l) =>
    approved.includes(l),
  );
  const prior30Requested = requested.filter((l) => inPrior30(l.updatedAt));
  const prior30Approved = prior30Requested.filter((l) =>
    approved.includes(l),
  );
  const r1 =
    last30Requested.length === 0
      ? 0
      : last30Approved.length / last30Requested.length;
  const r0 =
    prior30Requested.length === 0
      ? 0
      : prior30Approved.length / prior30Requested.length;
  const delta = r1 - r0;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Reporting
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-950">Förderquote</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Anteil bewilligter Bildungsgutscheine an allen gestellten Anträgen.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard label="Quote gesamt" value={`${Math.round(quote * 100)} %`} tone="brand" />
        <KpiCard
          label="Letzte 30 Tage"
          value={`${Math.round(r1 * 100)} %`}
          tone="accent"
        />
        <KpiCard
          label="Veränderung ggü. Vormonat"
          value={`${delta >= 0 ? "+" : ""}${Math.round(delta * 100)} pp`}
          tone={delta >= 0 ? "accent" : "rose"}
        />
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
        <h2 className="text-[13.5px] font-semibold text-navy-950">Aufschlüsselung</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
          <Stat label="Anträge gesamt" value={requested.length} />
          <Stat label="Bewilligt" value={approved.length} />
          <Stat label="Anträge 30 Tage" value={last30Requested.length} />
          <Stat label="Bewilligt 30 Tage" value={last30Approved.length} />
        </dl>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "brand" | "accent" | "rose";
}) {
  const accent =
    tone === "rose"
      ? "before:bg-rose-500"
      : tone === "accent"
        ? "before:bg-accent-600"
        : "before:bg-brand-700";
  return (
    <article
      className={[
        "relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-5 shadow-sm",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]",
        accent,
      ].join(" ")}
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-navy-950">{value}</p>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-surface-subtle/50 p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 text-[18px] font-semibold text-navy-950">{value}</dd>
    </div>
  );
}
