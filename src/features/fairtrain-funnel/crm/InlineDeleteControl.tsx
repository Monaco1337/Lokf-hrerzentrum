/**
 * InlineDeleteControl — the two-step soft-confirm delete button used inside
 * the lead list row. Lives in its own file to keep `LeadListRow.tsx` under
 * the `max-lines` guard.
 */
"use client";

import { CheckIcon, CloseIcon, CloseIconSm } from "./LeadListIcons";

interface InlineDeleteControlProps {
  confirming: boolean;
  pending: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function InlineDeleteControl({
  confirming,
  pending,
  onAsk,
  onCancel,
  onConfirm,
}: InlineDeleteControlProps) {
  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1 rounded-xl border border-ink/[0.08] bg-white/80 px-1.5 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md">
        <button
          type="button"
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            onConfirm();
          }}
          aria-label="Löschen bestätigen"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          <CheckIcon />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          aria-label="Abbrechen"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
        >
          <CloseIconSm />
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onAsk();
      }}
      aria-label="Lead löschen"
      title="Löschen"
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink/[0.08] bg-white/80 text-ink-soft shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-[0_6px_14px_-8px_rgba(220,38,38,0.25)] focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
    >
      <CloseIcon />
    </button>
  );
}
