"use client";

/**
 * WhatsAppNumberAdmin — manage the WhatsApp Business sender fleet.
 *
 * Add a number (label + display phone + Meta phone_number_id + owning rep),
 * (de)activate it, reassign the owner, or delete it. All mutations go through
 * server actions; the list is kept in local state for instant feedback.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  WhatsAppConfigInfo,
  WhatsAppNumberRecord,
} from "@/features/fairtrain-funnel/messaging/types";
import { ROLE_LABEL, type Role } from "@/features/fairtrain-funnel/userTypes";
import {
  createWhatsAppNumber,
  deleteWhatsAppNumber,
  updateWhatsAppNumber,
} from "@/server/actions/whatsappNumbers";

interface Rep {
  id: string;
  name: string;
  role: Role;
}

const WEBHOOK_URL = "https://www.xn--lokfhrerzentrum-2vb.de/api/whatsapp/webhook";

export function WhatsAppNumberAdmin({
  initialNumbers,
  reps,
  config,
}: {
  initialNumbers: WhatsAppNumberRecord[];
  reps: Rep[];
  config: WhatsAppConfigInfo;
}) {
  const router = useRouter();
  const [numbers, setNumbers] = useState<WhatsAppNumberRecord[]>(initialNumbers);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function repName(id: string | null): string {
    if (!id) return "—";
    return reps.find((r) => r.id === id)?.name ?? "Unbekannt";
  }

  function handleCreate(form: FormData) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await createWhatsAppNumber({
        label: form.get("label"),
        displayPhone: form.get("displayPhone"),
        phoneNumberId: form.get("phoneNumberId"),
        assignedUserId: form.get("assignedUserId") || null,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNumbers((cur) => [...cur, res.data]);
      setNotice(`Nummer „${res.data.label}" hinzugefügt.`);
      (document.getElementById("wa-number-form") as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  function handleUpdate(
    id: string,
    patch: { assignedUserId?: string | null; active?: boolean },
  ) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await updateWhatsAppNumber({ id, ...patch });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNumbers((cur) => cur.map((n) => (n.id === id ? res.data : n)));
      router.refresh();
    });
  }

  function handleDelete(id: string, label: string) {
    if (!confirm(`Nummer „${label}" wirklich löschen?`)) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await deleteWhatsAppNumber({ id });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNumbers((cur) => cur.filter((n) => n.id !== id));
      setNotice("Nummer gelöscht.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-[#111827]">WhatsApp-Nummern</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Alle Vertriebs-Nummern laufen über einen WABA + ein Token. Neue Nummer
          hier anlegen → sofort live, kein Deploy nötig.
        </p>
      </header>

      <ConfigBanner config={config} activeCount={numbers.filter((n) => n.active).length} />

      {error ? (
        <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-sm text-[#B91C1C]">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2.5 text-sm text-[#15803D]">
          {notice}
        </p>
      ) : null}

      {/* Add number */}
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#111827]">Nummer hinzufügen</h2>
        <form
          id="wa-number-form"
          action={handleCreate}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Bezeichnung">
            <input name="label" required placeholder="Vertrieb Danijel" className={inputClass} />
          </Field>
          <Field label="Telefonnummer (Anzeige)">
            <input name="displayPhone" required placeholder="+4915112345678" className={inputClass} />
          </Field>
          <Field label="Meta phone_number_id">
            <input name="phoneNumberId" required placeholder="123456789012345" className={inputClass} />
          </Field>
          <Field label="Zuständiger Vertriebler">
            <select name="assignedUserId" className={inputClass} defaultValue="">
              <option value="">— keiner —</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({ROLE_LABEL[r.role]})
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F2937] disabled:opacity-50"
            >
              {pending ? "Speichert…" : "Nummer hinzufügen"}
            </button>
          </div>
        </form>
      </section>

      {/* List */}
      <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        {numbers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#6B7280]">
            Noch keine Nummern angelegt.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#EEF0F3] bg-[#F9FAFB] text-[12px] uppercase tracking-wide text-[#6B7280]">
              <tr>
                <th className="px-4 py-3 font-medium">Nummer</th>
                <th className="px-4 py-3 font-medium">phone_number_id</th>
                <th className="px-4 py-3 font-medium">Vertriebler</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {numbers.map((n) => (
                <tr key={n.id} className="border-b border-[#F3F4F6] last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#111827]">{n.label}</div>
                    <div className="text-[13px] text-[#6B7280]">{n.displayPhone}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[#6B7280]">
                    {n.phoneNumberId}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={n.assignedUserId ?? ""}
                      disabled={pending}
                      onChange={(e) =>
                        handleUpdate(n.id, { assignedUserId: e.target.value || null })
                      }
                      className={inputClass}
                    >
                      <option value="">— keiner —</option>
                      {reps.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <span className="sr-only">{repName(n.assignedUserId)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleUpdate(n.id, { active: !n.active })}
                      className={
                        n.active
                          ? "rounded-full bg-[#DCFCE7] px-3 py-1 text-[12px] font-medium text-[#15803D]"
                          : "rounded-full bg-[#F3F4F6] px-3 py-1 text-[12px] font-medium text-[#6B7280]"
                      }
                    >
                      {n.active ? "Aktiv" : "Inaktiv"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDelete(n.id, n.label)}
                      className="text-[13px] font-medium text-[#B91C1C] hover:underline disabled:opacity-50"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none transition focus:border-[#111827]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[#374151]">{label}</span>
      {children}
    </label>
  );
}

function ConfigBanner({
  config,
  activeCount,
}: {
  config: WhatsAppConfigInfo;
  activeCount: number;
}) {
  const live = config.isLive;
  return (
    <div
      className={
        live
          ? "rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-4"
          : "rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4"
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold text-[#111827]">
          {live ? "Live-Versand aktiv" : "Simulationsmodus"}
        </span>
        <span className="text-[#6B7280]">Provider: {config.providerName}</span>
        <span className="text-[#6B7280]">Aktive Nummern: {activeCount}</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#6B7280]">
        <li>{config.hasToken ? "✓" : "✗"} WABA-Token</li>
        <li>{config.hasVerifyToken ? "✓" : "✗"} Verify-Token</li>
        <li>{config.hasAppSecret ? "✓" : "✗"} App-Secret</li>
      </ul>
      <p className="mt-3 text-[12px] text-[#6B7280]">
        Webhook-URL (in Meta eintragen, Feld <strong>messages</strong> abonnieren):
        <br />
        <code className="mt-1 inline-block rounded bg-white/70 px-2 py-1 font-mono text-[11px] text-[#374151]">
          {WEBHOOK_URL}
        </code>
      </p>
    </div>
  );
}
