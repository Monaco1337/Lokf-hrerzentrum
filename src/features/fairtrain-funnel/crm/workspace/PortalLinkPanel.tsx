"use client";
/**
 * Admin control for the applicant self-service portal link (Bewerberportal).
 * The plaintext URL is shown exactly once on creation (only the hash is stored).
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  PORTAL_LINK_STATUS_LABEL,
  type PortalLinkEntry,
} from "../../types";
import {
  createPortalLink,
  setPortalLinkEnabled,
  setPortalLinkExpiry,
} from "@/server/actions/portalAdmin";

function statusTone(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "OPENED":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "ACTIVE":
      return "bg-brand-50 text-brand-700 ring-brand-200";
    case "EXPIRED":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function toDateInput(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export function PortalLinkPanel({
  leadId,
  link,
}: {
  leadId: string;
  link: PortalLinkEntry | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiry, setExpiry] = useState(
    link ? toDateInput(link.expiresAt) : "",
  );

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok && res.message) setError(res.message);
      router.refresh();
    });

  const create = () =>
    startTransition(async () => {
      setError(null);
      setUrl(null);
      const res = await createPortalLink({ leadId });
      if (!res.ok) setError(res.message);
      else {
        setUrl(res.data.url);
        router.refresh();
      }
    });

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const enabled = link?.status !== "DISABLED";

  return (
    <div className="space-y-4">
      {link ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusTone(
                link.displayStatus,
              )}`}
            >
              {PORTAL_LINK_STATUS_LABEL[link.displayStatus]}
            </span>
            <span className="text-xs text-ink-muted">
              Gültig bis {new Date(link.expiresAt).toLocaleDateString("de-DE")}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs text-ink-soft">
            <div>
              <dt className="text-ink-muted">Geöffnet</dt>
              <dd>{link.openedAt ? new Date(link.openedAt).toLocaleString("de-DE") : "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Abgeschlossen</dt>
              <dd>{link.completedAt ? new Date(link.completedAt).toLocaleString("de-DE") : "—"}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="label" htmlFor="portal-expiry">Ablaufdatum</label>
              <input
                id="portal-expiry"
                type="date"
                className="input"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn-secondary"
              disabled={pending || !expiry}
              onClick={() =>
                run(() =>
                  setPortalLinkExpiry({
                    linkId: link.id,
                    leadId,
                    expiresAt: new Date(expiry).toISOString(),
                  }),
                )
              }
            >
              Speichern
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() =>
                run(() =>
                  setPortalLinkEnabled({ linkId: link.id, leadId, enabled: !enabled }),
                )
              }
            >
              {enabled ? "Deaktivieren" : "Aktivieren"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={create}
            >
              Neuen Link erzeugen
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">
            Noch kein Bewerberportal-Link vorhanden. Erzeuge einen sicheren
            Self-Service-Link für diesen Bewerber.
          </p>
          <button type="button" className="btn-primary" disabled={pending} onClick={create}>
            {pending ? "Erzeuge…" : "Bewerberportal-Link erzeugen"}
          </button>
        </div>
      )}

      {url ? (
        <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <p className="text-xs font-medium text-emerald-800">
            Link erstellt (nur jetzt sichtbar – sicher kopieren):
          </p>
          <p className="mt-1 break-all text-xs text-emerald-900">{url}</p>
          <button type="button" className="btn-secondary mt-2" onClick={copy}>
            {copied ? "Kopiert ✓" : "Link kopieren"}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
