/**
 * WhatsAppConfigPanel — read-only WhatsApp Cloud API configuration health.
 *
 * Shows the adapter mode and which secrets are present (booleans only). Never
 * renders any secret value. Driven by `getWhatsAppConfigStatus()` server-side.
 */
import type { WhatsAppConfigInfo } from "@/features/fairtrain-funnel/messaging/types";

const STATUS_META: Record<
  WhatsAppConfigInfo["status"],
  { label: string; hint: string; cls: string }
> = {
  configured: {
    label: "Konfiguriert · Live",
    hint: "Echte WhatsApp-Nachrichten können serverseitig versendet werden.",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  missing_env: {
    label: "ENV unvollständig",
    hint: "Provider „meta“ gewählt, aber Token/Phone-Number-ID fehlen. Es wird simuliert.",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  disabled: {
    label: "Deaktiviert",
    hint: "WhatsApp ist abgeschaltet (WHATSAPP_PROVIDER=disabled).",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
  },
  demo_only: {
    label: "Demo-Modus",
    hint: "Simulationsadapter aktiv – es werden keine echten Nachrichten gesendet.",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink/10 bg-surface-subtle/60 px-3 py-2">
      <span className="text-[12px] text-ink-soft">{label}</span>
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
          on ? "text-emerald-700" : "text-ink-muted"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-ink-muted/50"}`}
        />
        {on ? "gesetzt" : "fehlt"}
      </span>
    </div>
  );
}

export function WhatsAppConfigPanel({ config }: { config: WhatsAppConfigInfo }) {
  const meta = STATUS_META[config.status];
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-navy-950">
          WhatsApp Business Cloud API
        </h2>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${meta.cls}`}
        >
          {meta.label}
        </span>
      </div>
      <p className="mt-1.5 text-[12.5px] text-ink-soft">{meta.hint}</p>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
        <div className="rounded-lg border border-ink/10 bg-surface-subtle/60 p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Provider
          </dt>
          <dd className="mt-1 font-mono text-[12px] text-ink">{config.providerName}</dd>
        </div>
        <div className="rounded-lg border border-ink/10 bg-surface-subtle/60 p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Aktiver Adapter
          </dt>
          <dd className="mt-1 font-mono text-[12px] text-ink">{config.adapter}</dd>
        </div>
      </dl>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Flag label="META_WABA_TOKEN" on={config.hasToken} />
        <Flag label="META_PHONE_NUMBER_ID" on={config.hasPhoneNumberId} />
        <Flag label="WHATSAPP_VERIFY_TOKEN" on={config.hasVerifyToken} />
        <Flag label="WHATSAPP_APP_SECRET" on={config.hasAppSecret} />
      </div>

      <p className="mt-3 text-[11.5px] text-ink-muted">
        Webhook-Endpunkt: <span className="font-mono">/api/whatsapp/webhook</span> ·
        Secrets werden ausschließlich serverseitig gelesen und niemals angezeigt.
      </p>
    </section>
  );
}
