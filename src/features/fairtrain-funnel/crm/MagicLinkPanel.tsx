"use client";
import { useState, useTransition } from "react";

import { sendMagicLink } from "@/server/actions/sendMagicLink";

export function MagicLinkPanel({ leadId }: { leadId: string }) {
  const [scope, setScope] = useState<"COMPLETE_PROFILE" | "UPLOAD_DOCS">(
    "COMPLETE_PROFILE",
  );
  const [channel, setChannel] = useState<"WHATSAPP" | "EMAIL">("WHATSAPP");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  function send() {
    setError(null);
    setUrl(null);
    startTransition(async () => {
      const res = await sendMagicLink({ leadId, scope, channel });
      if (!res.ok) setError(res.message);
      else setUrl(res.data.url);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ml-scope">Zweck</label>
          <select
            id="ml-scope"
            className="input"
            value={scope}
            onChange={(e) =>
              setScope(e.target.value as "COMPLETE_PROFILE" | "UPLOAD_DOCS")
            }
          >
            <option value="COMPLETE_PROFILE">Profil vervollständigen</option>
            <option value="UPLOAD_DOCS">Dokumente hochladen</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ml-channel">Kanal</label>
          <select
            id="ml-channel"
            className="input"
            value={channel}
            onChange={(e) => setChannel(e.target.value as "WHATSAPP" | "EMAIL")}
          >
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">E-Mail</option>
          </select>
        </div>
      </div>
      <button
        type="button"
        className="btn-secondary"
        onClick={send}
        disabled={pending}
      >
        {pending ? "Sende …" : "Magic-Link senden"}
      </button>
      {url ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 break-all">
          Gesendet. Link (nur einmal sichtbar): {url}
        </p>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
