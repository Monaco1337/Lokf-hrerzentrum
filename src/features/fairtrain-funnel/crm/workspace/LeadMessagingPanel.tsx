"use client";
/**
 * LeadMessagingPanel — simulated communication control surface for one lead.
 *
 * Capabilities (all demo/simulation, no real messages):
 *  - send a template (server resolves variables + records the ledger message)
 *  - log a manual outbound message
 *  - simulate an inbound reply from one of the canned answers
 *  - advance the delivery lifecycle / simulate a failed delivery per message
 */
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  COMMUNICATION_CHANNEL_LABEL,
  type CommunicationChannel,
  MESSAGE_STATUS_LABEL,
  META_APPROVAL_STATUS_LABEL,
  type MessageStatusT,
} from "@/features/fairtrain-funnel/types";
import {
  advanceMessageStatus,
  failMessage,
  logManualMessage,
  sendTemplateMessage,
  simulateInboundMessage,
} from "@/server/actions/messaging";

export interface TemplateOption {
  id: string;
  name: string;
  channel: string;
  category: string;
  body: string;
  approvalStatus: string | null;
}

export interface OutboundMessageRef {
  id: string;
  body: string;
  channel: string;
  status: MessageStatusT;
}

const INBOUND_SAMPLES: ReadonlyArray<string> = [
  "Ja, ich fülle es aus.",
  "Ich habe keine Unterlagen.",
  "Bitte rufen Sie mich morgen an.",
  "Ich bin nicht mehr interessiert.",
  "Ich habe den Bildungsgutschein schon.",
  "Ich brauche Hilfe beim Ausfüllen.",
];

const CHANNELS: ReadonlyArray<CommunicationChannel> = [
  "WHATSAPP",
  "EMAIL",
  "INTERNAL",
];

function statusPill(status: MessageStatusT): string {
  switch (status) {
    case "READ":
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700";
    case "SENT":
    case "QUEUED":
      return "bg-blue-50 text-blue-700";
    case "FAILED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function LeadMessagingPanel({
  leadId,
  templates,
  outbound,
  whatsappLive = false,
}: {
  leadId: string;
  templates: ReadonlyArray<TemplateOption>;
  outbound: ReadonlyArray<OutboundMessageRef>;
  whatsappLive?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [manualChannel, setManualChannel] = useState<CommunicationChannel>("WHATSAPP");
  const [manualBody, setManualBody] = useState("");
  const [inboundChannel, setInboundChannel] = useState<CommunicationChannel>("WHATSAPP");

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );

  // A WhatsApp template with live sending configured performs a REAL Meta send.
  const willSendReal = whatsappLive && selectedTemplate?.channel === "WHATSAPP";

  function run(action: () => Promise<{ ok: boolean; message?: string }>, ok: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.message ?? "Aktion fehlgeschlagen");
      else {
        setNotice(ok);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Template senden */}
      <div className="space-y-2">
        <p className="label">{whatsappLive ? "Vorlage senden" : "Vorlage simuliert senden"}</p>
        {templates.length === 0 ? (
          <p className="text-xs text-ink-muted">Keine aktiven Vorlagen vorhanden.</p>
        ) : (
          <>
            <select
              className="input"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {COMMUNICATION_CHANNEL_LABEL[
                    t.channel as keyof typeof COMMUNICATION_CHANNEL_LABEL
                  ] ?? t.channel}
                  {" · "}
                  {t.name}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedTemplate.approvalStatus && (
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${
                        selectedTemplate.approvalStatus === "approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : selectedTemplate.approvalStatus === "rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      Meta:{" "}
                      {META_APPROVAL_STATUS_LABEL[
                        selectedTemplate.approvalStatus as keyof typeof META_APPROVAL_STATUS_LABEL
                      ] ?? selectedTemplate.approvalStatus}
                    </span>
                  )}
                  <span className="text-[10.5px] text-ink-muted">
                    {whatsappLive ? "Live-Versand aktiv" : "Demo-Simulation"}
                  </span>
                </div>
                <p className="line-clamp-4 whitespace-pre-wrap rounded-lg bg-surface-subtle p-2.5 text-[11.5px] text-ink-soft">
                  {selectedTemplate.body}
                </p>
                {whatsappLive &&
                  selectedTemplate.channel === "WHATSAPP" &&
                  selectedTemplate.approvalStatus !== "approved" && (
                    <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">
                      Echter WhatsApp-Versand ist blockiert: Vorlage ist nicht von
                      Meta freigegeben.
                    </p>
                  )}
              </>
            )}
            <button
              type="button"
              className={willSendReal ? "btn-primary" : "btn-secondary"}
              disabled={pending || !templateId}
              onClick={() =>
                run(
                  () => sendTemplateMessage({ leadId, templateId }),
                  willSendReal ? "WhatsApp gesendet." : "Vorlage simuliert gesendet.",
                )
              }
            >
              {pending ? "Sende …" : willSendReal ? "WhatsApp senden" : "Simuliert senden"}
            </button>
          </>
        )}
      </div>

      <div className="border-t border-ink/[0.07]" />

      {/* Manuelle Nachricht protokollieren */}
      <div className="space-y-2">
        <p className="label">Manuelle Nachricht protokollieren</p>
        <div className="flex gap-2">
          <select
            className="input max-w-[42%]"
            value={manualChannel}
            onChange={(e) => setManualChannel(e.target.value as CommunicationChannel)}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {COMMUNICATION_CHANNEL_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="input min-h-[64px]"
          placeholder="Nachrichtentext …"
          value={manualBody}
          onChange={(e) => setManualBody(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={pending || manualBody.trim().length === 0}
          onClick={() =>
            run(() => {
              const body = manualBody.trim();
              return logManualMessage({ leadId, channel: manualChannel, body }).then(
                (r) => {
                  if (r.ok) setManualBody("");
                  return r;
                },
              );
            }, "Nachricht protokolliert.")
          }
        >
          Protokollieren
        </button>
      </div>

      <div className="border-t border-ink/[0.07]" />

      {/* Eingehende Antwort simulieren */}
      <div className="space-y-2">
        <p className="label">Eingehende Antwort simulieren</p>
        <select
          className="input"
          value={inboundChannel}
          onChange={(e) => setInboundChannel(e.target.value as CommunicationChannel)}
        >
          {CHANNELS.filter((c) => c !== "INTERNAL").map((c) => (
            <option key={c} value={c}>
              {COMMUNICATION_CHANNEL_LABEL[c]}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {INBOUND_SAMPLES.map((sample) => (
            <button
              key={sample}
              type="button"
              disabled={pending}
              className="rounded-full border border-ink/[0.12] px-2.5 py-1 text-[11px] text-ink-soft transition hover:border-brand/40 hover:text-brand disabled:opacity-50"
              onClick={() =>
                run(
                  () =>
                    simulateInboundMessage({
                      leadId,
                      channel: inboundChannel,
                      body: sample,
                    }),
                  "Eingehende Antwort simuliert.",
                )
              }
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {outbound.length > 0 && (
        <>
          <div className="border-t border-ink/[0.07]" />
          <div className="space-y-2">
            <p className="label">Zustellstatus simulieren</p>
            <ul className="space-y-1.5">
              {outbound.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-ink/[0.07] px-2.5 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-soft">
                    {m.body.slice(0, 60)}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusPill(m.status)}`}
                  >
                    {MESSAGE_STATUS_LABEL[m.status]}
                  </span>
                  <button
                    type="button"
                    disabled={pending || m.status === "READ" || m.status === "FAILED"}
                    className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-40"
                    onClick={() =>
                      run(
                        () => advanceMessageStatus({ messageId: m.id }),
                        "Status weitergeschaltet.",
                      )
                    }
                  >
                    Weiter
                  </button>
                  <button
                    type="button"
                    disabled={pending || m.status === "FAILED"}
                    className="shrink-0 rounded-md bg-red-50 px-2 py-0.5 text-[10.5px] font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-40"
                    onClick={() =>
                      run(
                        () =>
                          failMessage({
                            messageId: m.id,
                            reason: "Empfänger nicht erreichbar",
                          }),
                        "Fehlschlag simuliert.",
                      )
                    }
                  >
                    Fehlschlag
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {notice && (
        <p className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">{notice}</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
