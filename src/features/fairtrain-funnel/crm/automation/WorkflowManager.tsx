"use client";
/**
 * WorkflowManager — the unified automation overview. Groups every workflow by
 * its process (Reaktivierung / Bewerbungsprozess / Antwort-Router / Eigener) so
 * it is instantly clear which automation drives which part of the funnel. Opens
 * the visual graph builder for create/edit.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  PROCESS_KEY_LABEL,
  ROUTER_PATH_LABEL,
  ROUTER_PATHS,
  WORKFLOW_TRIGGER_LABEL,
  type WorkflowProcessKey,
} from "@/features/fairtrain-funnel/automation/workflow/graph";
import type {
  WorkflowBackfillPreview,
  WorkflowBackfillResult,
  WorkflowSummary,
  WorkflowTemplateOption,
} from "@/features/fairtrain-funnel/automation/workflow/types";
import {
  deleteWorkflow,
  migrateReactivationToEngine,
  previewWorkflowBackfill,
  rebuildRouterLayout,
  runWorkflowBackfill,
  seedDefaultWorkflows,
  setWorkflowStatus,
} from "@/server/actions/workflows";

import { WorkflowGraphBuilder } from "./WorkflowGraphBuilder";

interface Props {
  workflows: ReadonlyArray<WorkflowSummary>;
  templates: ReadonlyArray<WorkflowTemplateOption>;
  users: ReadonlyArray<{ id: string; name: string }>;
  engineEnabled: boolean;
}

const GROUP_ORDER: WorkflowProcessKey[] = [
  "reactivation",
  "inbound_router",
  "application",
  "custom",
];

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function WorkflowManager({ workflows, templates, users, engineEnabled }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<WorkflowSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);
  const [backfill, setBackfill] = useState<WorkflowBackfillPreview | null>(null);
  const [backfillResult, setBackfillResult] = useState<WorkflowBackfillResult | null>(null);

  if (creating) {
    return <WorkflowGraphBuilder workflow={null} templates={templates} users={users} onClose={() => setCreating(false)} />;
  }
  if (editing) {
    return <WorkflowGraphBuilder workflow={editing} templates={templates} users={users} onClose={() => setEditing(null)} />;
  }

  function seed() {
    start(async () => {
      const res = await seedDefaultWorkflows();
      setFlash(
        res.ok
          ? { ok: true, msg: res.data.created.length ? `Angelegt: ${res.data.created.join(", ")}` : "Standard-Prozesse existieren bereits." }
          : { ok: false, msg: res.message },
      );
      router.refresh();
    });
  }

  function rebuildLayout() {
    if (
      !window.confirm(
        "KI-Antwort-Router auf das saubere Parallel-Layout zurücksetzen (zentraler Router → alle Kategorien verzweigen parallel nach unten)? Die zugewiesenen Vorlagen pro Kategorie bleiben erhalten. Laufende Leads behalten ihre aktuelle Version.",
      )
    )
      return;
    start(async () => {
      const res = await rebuildRouterLayout();
      setFlash(
        res.ok
          ? {
              ok: true,
              msg: res.data.updated.length
                ? `Neu aufgebaut: ${res.data.updated.join(", ")}`
                : "Kein aktiver Antwort-Router gefunden – zuerst „Standard-Prozesse anlegen“.",
            }
          : { ok: false, msg: res.message },
      );
      router.refresh();
    });
  }

  function migrate() {
    if (!window.confirm("Alle offenen Reaktivierungs-Leads (Alt-Kampagne) einmalig in die Workflow-Engine übernehmen? Bereits kontaktierte Leads werden ohne erneuten Versand fortgesetzt, die alte Warteschlange wird stillgelegt.")) return;
    start(async () => {
      const res = await migrateReactivationToEngine();
      setFlash(
        res.ok
          ? { ok: true, msg: `Übernommen: ${res.data.enrolled} neu gestartet, ${res.data.continued} fortgesetzt, ${res.data.skipped} übersprungen.` }
          : { ok: false, msg: res.message },
      );
      router.refresh();
    });
  }

  function openBackfill() {
    setBackfillResult(null);
    setFlash(null);
    start(async () => {
      const res = await previewWorkflowBackfill({ scope: "reactivation" });
      if (res.ok) setBackfill(res.data);
      else setFlash({ ok: false, msg: res.message });
    });
  }

  function confirmBackfill() {
    start(async () => {
      const res = await runWorkflowBackfill({ scope: "reactivation" });
      if (res.ok) {
        setBackfillResult(res.data);
        setBackfill(null);
        setFlash({
          ok: true,
          msg: `Nachverarbeitung fertig: ${res.data.processed} Antworten verarbeitet, ${res.data.manualReview} zur manuellen Prüfung, ${res.data.skipped} übersprungen.`,
        });
        router.refresh();
      } else {
        setFlash({ ok: false, msg: res.message });
      }
    });
  }

  function toggle(w: WorkflowSummary) {
    start(async () => {
      await setWorkflowStatus({ id: w.id, status: w.status === "active" ? "inactive" : "active" });
      router.refresh();
    });
  }

  function remove(w: WorkflowSummary) {
    if (!window.confirm(`Prozess „${w.name}" löschen? Laufende Läufe werden dadurch nicht mehr fortgesetzt.`)) return;
    start(async () => {
      await deleteWorkflow({ id: w.id });
      router.refresh();
    });
  }

  const grouped = GROUP_ORDER.map((key) => ({
    key,
    items: workflows.filter((w) => w.processKey === key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      {/* Engine status banner */}
      <div className={`rounded-2xl px-4 py-3 text-[13px] ring-1 ${engineEnabled ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"}`}>
        {engineEnabled
          ? "Workflow-Engine ist aktiv: eingehende WhatsApp-Antworten werden automatisch klassifiziert und der passende nächste Schritt gesendet — pro Lead immer nur einer, ohne Dopplungen."
          : "Workflow-Engine ist noch nicht aktiviert (WORKFLOW_ENGINE_ENABLED). Prozesse können bereits gebaut werden; live geschaltet wird nach Aktivierung des Feature-Flags."}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-soft">
          Ein Prozess pro Ziel. Ein Lead erhält immer nur den einen nächsten Schritt.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={pending} onClick={seed} className="rounded-xl bg-surface-subtle px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 hover:bg-accent-50 disabled:opacity-50">
            Standard-Prozesse anlegen
          </button>
          <button type="button" disabled={pending} onClick={rebuildLayout} className="rounded-xl bg-surface-subtle px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 hover:bg-accent-50 disabled:opacity-50">
            Antwort-Router neu aufbauen
          </button>
          <button type="button" disabled={pending} onClick={migrate} className="rounded-xl bg-surface-subtle px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 hover:bg-accent-50 disabled:opacity-50">
            Reaktivierung übernehmen
          </button>
          <button type="button" disabled={pending} onClick={openBackfill} className="rounded-xl bg-surface-subtle px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 hover:bg-accent-50 disabled:opacity-50">
            Vorhandene Antworten nachverarbeiten
          </button>
          <button type="button" onClick={() => setCreating(true)} className="rounded-xl bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-700">
            Neuer Prozess
          </button>
        </div>
      </div>

      {flash ? (
        <div className={`rounded-xl px-4 py-2.5 text-[13px] font-medium ring-1 ${flash.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
          {flash.msg}
        </div>
      ) : null}

      {backfill ? (
        <div className="space-y-3 rounded-2xl border border-ink/[0.08] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[15px] font-bold text-navy-950">
                Vorschau: unbehandelte Antworten nachverarbeiten
              </h3>
              <p className="mt-1 text-[12.5px] text-ink-soft">
                {backfill.eligible} noch nicht klassifizierte Antworten würden über den KI-Router verarbeitet
                ({backfill.scanned} geprüft, {backfill.skipped} übersprungen). Es werden nur bisher
                unbehandelte Antworten verarbeitet – bereits klassifizierte, abgemeldete oder manuell
                bearbeitete Leads bleiben unberührt, keine Nachricht wird doppelt gesendet.
              </p>
              {!backfill.hasActiveRouter ? (
                <p className="mt-1.5 text-[12px] font-medium text-amber-700">
                  Achtung: Es ist noch kein aktiver Prozess mit KI-Router vorhanden. Bitte zuerst „Standard-Prozesse anlegen“ und aktivieren.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ROUTER_PATHS.filter((p) => backfill.byCategory[p] > 0).map((p) => (
              <div key={p} className="rounded-lg border border-ink/[0.08] bg-surface-subtle/50 px-3 py-2">
                <p className="text-[11px] text-ink-muted">{ROUTER_PATH_LABEL[p]}</p>
                <p className="text-[16px] font-bold text-navy-950">{backfill.byCategory[p]}</p>
              </div>
            ))}
          </div>

          {backfill.samples.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[11.5px] font-semibold text-ink-soft">Beispiele</p>
              <ul className="space-y-1">
                {backfill.samples.map((s) => (
                  <li key={s.leadId} className="flex items-center gap-2 text-[12px] text-ink-soft">
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10.5px] font-semibold text-brand-700">{s.pathLabel}</span>
                    <span className="min-w-0 flex-1 truncate">{s.name}: „{s.message}“</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button type="button" disabled={pending || backfill.eligible === 0} onClick={confirmBackfill} className="rounded-xl bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">
              {pending ? "Verarbeite…" : `Jetzt ${backfill.eligible} verarbeiten`}
            </button>
            <button type="button" onClick={() => setBackfill(null)} className="rounded-xl bg-surface-subtle px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 hover:bg-slate-200">
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}

      {backfillResult ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[12.5px] text-emerald-900">
          Nachverarbeitung abgeschlossen: {backfillResult.processed} verarbeitet ·
          {" "}{backfillResult.manualReview} manuelle Prüfung · {backfillResult.skipped} übersprungen ·
          {" "}{backfillResult.errors} Fehler.
        </div>
      ) : null}

      {workflows.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink/15 bg-surface-subtle/40 py-14 text-center">
          <p className="text-[15px] font-semibold text-navy-950">Noch keine Prozesse</p>
          <p className="mt-1.5 max-w-md text-[13px] text-ink-muted">
            Lege mit „Standard-Prozesse anlegen“ die drei Kernprozesse an (Reaktivierung, Antwort-Router, Bewerbungsprozess) oder baue einen eigenen.
          </p>
        </div>
      ) : (
        grouped.map((g) => (
          <section key={g.key} className="space-y-2.5">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-navy-950">
              {PROCESS_KEY_LABEL[g.key]}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{g.items.length}</span>
            </h2>
            <ul className="space-y-2.5">
              {g.items.map((w) => (
                <li key={w.id} className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[15px] font-bold text-navy-950">{w.name}</h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_BADGE[w.status]}`}>
                          {w.status === "active" ? "Aktiv" : w.status === "draft" ? "Entwurf" : "Inaktiv"}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-ink-muted">
                        Auslöser: {WORKFLOW_TRIGGER_LABEL[w.trigger]} · {w.graph.nodes.length} Schritte · {w.liveRuns} aktive Läufe
                      </p>
                      {w.description ? (
                        <p className="mt-1 text-[12.5px] text-ink-soft [overflow-wrap:anywhere]">{w.description}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5 text-[13px]">
                      <button type="button" disabled={pending} onClick={() => toggle(w)} className="rounded-lg bg-surface-subtle px-3 py-1.5 font-medium text-ink-soft hover:text-ink disabled:opacity-50">
                        {w.status === "active" ? "Pausieren" : "Aktivieren"}
                      </button>
                      <button type="button" onClick={() => setEditing(w)} className="rounded-lg bg-brand-50 px-3 py-1.5 font-semibold text-brand-700 hover:bg-brand-100">
                        Bearbeiten
                      </button>
                      <button type="button" onClick={() => remove(w)} className="rounded-lg px-2.5 py-1.5 text-ink-muted hover:bg-rose-50 hover:text-rose-600">
                        Löschen
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
