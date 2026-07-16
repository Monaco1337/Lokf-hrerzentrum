"use client";

/**
 * MultichatActionPanel — the right-hand "Arbeitszentrale" for a reactivation
 * chat. Everything an operator needs to fully handle an Alt-Lead without
 * leaving the Multichat: next-step hint, send Eignungscheck / Bewerbungslink,
 * templates, status change, Wiedervorlage, notes and mark-as-done. Apple-style:
 * light, glassy, rounded, green accents.
 */
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  MANUAL_RESOLUTIONS,
  type ManualResolutionId,
} from "@/features/fairtrain-funnel/contactState";
import {
  type MultichatConversation,
  type MultichatTemplateOption,
  WORK_STATUS_NEXT_ACTION,
} from "@/features/fairtrain-funnel/messaging/types";
import { addNote, listLeadNotes, type NoteListEntry } from "@/server/actions/addNote";
import { scheduleFollowUp } from "@/server/actions/scheduleFollowUp";
import { sendMagicLink } from "@/server/actions/sendMagicLink";
import {
  markReplyHandled,
  resolveMultichatConversation,
  sendEligibilityLink,
  sendTemplateMessage,
} from "@/server/actions/messaging";

import { MULTICHAT_DATE } from "./MultichatBadges";

const primaryBtn =
  "w-full rounded-2xl bg-emerald-500 px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-40";
const softBtn =
  "rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition hover:bg-white disabled:opacity-40";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-3 shadow-sm">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function MultichatActionPanel({
  convo,
  templates,
}: {
  convo: MultichatConversation;
  templates: MultichatTemplateOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<NoteListEntry[]>([]);

  const leadId = convo.leadId;

  useEffect(() => {
    let alive = true;
    setNotes([]);
    listLeadNotes({ leadId }).then((res) => {
      if (alive && res.ok) setNotes(res.data);
    });
    return () => {
      alive = false;
    };
  }, [leadId]);

  function run(
    fn: () => Promise<{ ok: boolean; message?: string }>,
    successMsg: string,
  ) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.message ?? "Aktion fehlgeschlagen.");
        return;
      }
      setNotice(successMsg);
      router.refresh();
    });
  }

  function handleTemplate() {
    if (!templateId) return;
    run(
      () => sendTemplateMessage({ leadId, templateId }),
      "Vorlage gesendet.",
    );
  }

  function handleResolve(id: ManualResolutionId, label: string) {
    run(
      () => resolveMultichatConversation({ leadId, resolution: id }),
      `Status gesetzt: ${label}`,
    );
  }

  function handleFollowUp(iso: string) {
    run(
      () => scheduleFollowUp({ leadId, when: iso }),
      "Wiedervorlage gespeichert.",
    );
  }

  function handleNote() {
    const body = note.trim();
    if (!body) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await addNote({ leadId, body });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNote("");
      setNotice("Notiz gespeichert.");
      const list = await listLeadNotes({ leadId });
      if (list.ok) setNotes(list.data);
      router.refresh();
    });
  }

  function inDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }

  return (
    <div className="flex max-h-[72vh] flex-col gap-3 overflow-y-auto pr-0.5">
      {/* Next action hint */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
          Nächster Schritt
        </p>
        <p className="mt-1 text-[13.5px] font-medium text-emerald-900">
          {WORK_STATUS_NEXT_ACTION[convo.workStatus]}
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12.5px] text-rose-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12.5px] text-emerald-700">
          {notice}
        </p>
      ) : null}

      {/* Quick contact */}
      <Section title="Kontakt">
        <div className="flex flex-wrap gap-1.5">
          <a href={`tel:${convo.phone}`} className={softBtn}>
            Anrufen
          </a>
          <Link href={`/crm/leads/${leadId}`} className={softBtn}>
            Lead öffnen
          </Link>
          {convo.unread > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => markReplyHandled({ leadId }),
                  "Antwort als bearbeitet markiert.",
                )
              }
              className={softBtn}
            >
              Antwort erledigt
            </button>
          ) : null}
        </div>
      </Section>

      {/* Send links */}
      <Section title="Links senden">
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={pending || convo.optOut}
            onClick={() =>
              run(() => sendEligibilityLink({ leadId }), "Eignungscheck gesendet.")
            }
            className={primaryBtn}
          >
            Eignungscheck senden
          </button>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={pending || convo.optOut}
              onClick={() =>
                run(
                  () =>
                    sendMagicLink({
                      leadId,
                      scope: "COMPLETE_PROFILE",
                      channel: "WHATSAPP",
                    }),
                  "Bewerbungslink gesendet.",
                )
              }
              className={`flex-1 ${softBtn}`}
            >
              Bewerbungslink
            </button>
            <button
              type="button"
              disabled={pending || convo.optOut}
              onClick={() =>
                run(
                  () =>
                    sendMagicLink({
                      leadId,
                      scope: "UPLOAD_DOCS",
                      channel: "WHATSAPP",
                    }),
                  "Unterlagen-Link gesendet.",
                )
              }
              className={`flex-1 ${softBtn}`}
            >
              Unterlagen-Link
            </button>
          </div>
        </div>
      </Section>

      {/* Templates */}
      {templates.length > 0 ? (
        <Section title="Vorlage senden">
          <div className="flex gap-1.5">
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-2.5 py-2 text-[12.5px] text-slate-700 outline-none focus:border-emerald-400"
            >
              <option value="">Vorlage wählen…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending || !templateId || convo.optOut}
              onClick={handleTemplate}
              className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-[12.5px] font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40"
            >
              Senden
            </button>
          </div>
        </Section>
      ) : null}

      {/* Status */}
      <Section title="Bearbeitungsstatus">
        <div className="flex flex-wrap gap-1.5">
          {MANUAL_RESOLUTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={pending}
              onClick={() => handleResolve(r.id, r.label)}
              className={softBtn}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Wiedervorlage */}
      <Section title="Wiedervorlage">
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={() => handleFollowUp(inDays(1))}
            className={softBtn}
          >
            Morgen
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleFollowUp(inDays(3))}
            className={softBtn}
          >
            In 3 Tagen
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleFollowUp(inDays(7))}
            className={softBtn}
          >
            In 7 Tagen
          </button>
        </div>
        <div className="flex gap-1.5">
          <input
            type="datetime-local"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-2.5 py-2 text-[12.5px] text-slate-700 outline-none focus:border-emerald-400"
          />
          <button
            type="button"
            disabled={pending || !followUp}
            onClick={() => handleFollowUp(new Date(followUp).toISOString())}
            className="shrink-0 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-[12.5px] font-medium text-slate-700 transition hover:bg-white disabled:opacity-40"
          >
            Setzen
          </button>
        </div>
        {convo.followUpAt ? (
          <p className="mt-1.5 text-[11.5px] text-sky-700">
            Geplant: {MULTICHAT_DATE.format(new Date(convo.followUpAt))}
          </p>
        ) : null}
      </Section>

      {/* Notes */}
      <Section title="Notizen">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Notiz hinzufügen…"
          className="w-full resize-y rounded-xl border border-black/10 bg-white px-2.5 py-2 text-[12.5px] text-slate-900 outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          disabled={pending || !note.trim()}
          onClick={handleNote}
          className={`mt-1.5 ${primaryBtn}`}
        >
          Notiz speichern
        </button>
        <ul className="mt-2 space-y-1.5">
          {notes.length === 0 ? (
            <li className="text-[12px] text-slate-400">Noch keine Notizen.</li>
          ) : (
            notes.slice(0, 6).map((n) => (
              <li
                key={n.id}
                className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-[12.5px] text-slate-700"
              >
                <p className="whitespace-pre-wrap break-words">{n.body}</p>
                <p className="mt-0.5 text-[10.5px] text-slate-400">
                  {MULTICHAT_DATE.format(new Date(n.createdAt))}
                </p>
              </li>
            ))
          )}
        </ul>
      </Section>
    </div>
  );
}
