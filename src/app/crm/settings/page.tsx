import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { DemoDataPanel } from "@/features/fairtrain-funnel/crm/admin/DemoDataPanel";
import { WhatsAppConfigPanel } from "@/features/fairtrain-funnel/crm/admin/WhatsAppConfigPanel";
import { requireCrmUser } from "@/server/actions/_helpers";
import { demoDataService } from "@/server/services/DemoDataService";
import { getWhatsAppConfigStatus } from "@/server/services/messaging/whatsappService";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireCrmUser();
  if (!can(user.role, "canManageSettings")) {
    redirect("/crm");
  }
  const demoStatus = await demoDataService.status();
  const whatsappConfig = getWhatsAppConfigStatus();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-navy-950">Einstellungen</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Systemkonfiguration, Demo-Modus und Tools für Administratoren.
        </p>
      </header>

      <DemoDataPanel
        isSeeded={demoStatus.isSeeded}
        counts={demoStatus.counts}
        totalEntries={demoStatus.totalEntries}
      />

      <WhatsAppConfigPanel config={whatsappConfig} />

      <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-navy-950">System</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
          <div className="rounded-lg border border-ink/10 bg-surface-subtle/60 p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Datenbank
            </dt>
            <dd className="mt-1 font-mono text-[12px] text-ink">SQLite (dev)</dd>
          </div>
          <div className="rounded-lg border border-ink/10 bg-surface-subtle/60 p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Umgebung
            </dt>
            <dd className="mt-1 font-mono text-[12px] text-ink">
              {process.env.NODE_ENV ?? "development"}
            </dd>
          </div>
          <div className="rounded-lg border border-ink/10 bg-surface-subtle/60 p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Kommunikations-Provider
            </dt>
            <dd className="mt-1 font-mono text-[12px] text-ink">
              {process.env.COMMUNICATION_PROVIDER ?? "mock"}
            </dd>
          </div>
          <div className="rounded-lg border border-ink/10 bg-surface-subtle/60 p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Magic-Link TTL
            </dt>
            <dd className="mt-1 font-mono text-[12px] text-ink">
              {process.env.MAGIC_LINK_TTL_MINUTES ?? "60"} Minuten
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
