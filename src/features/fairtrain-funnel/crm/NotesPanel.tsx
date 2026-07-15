"use client";
import { useState, useTransition } from "react";

import { addNote } from "@/server/actions/addNote";

import type { NoteEntry } from "../types";

export function NotesPanel({
  leadId,
  initialNotes,
}: {
  leadId: string;
  initialNotes: ReadonlyArray<NoteEntry>;
}) {
  const [notes, setNotes] = useState<ReadonlyArray<NoteEntry>>(initialNotes);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await addNote({ leadId, body });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNotes([res.data, ...notes]);
      setBody("");
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="note-body">Neue Notiz</label>
        <textarea
          id="note-body"
          className="input min-h-[80px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <button
        type="button"
        className="btn-secondary"
        onClick={add}
        disabled={pending || !body.trim()}
      >
        {pending ? "Speichern …" : "Notiz hinzufügen"}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <ul className="mt-4 space-y-3">
        {notes.length === 0 ? (
          <li className="text-sm text-ink-muted">Noch keine Notizen.</li>
        ) : (
          notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-ink/10 p-3">
              <p className="whitespace-pre-line text-sm text-ink [overflow-wrap:anywhere]">{n.body}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {n.author} • {n.createdAt.toLocaleString("de-DE")}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
