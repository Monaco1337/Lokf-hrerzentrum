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
      <span className="inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-1 shadow-sm ring-1 ring-ink/10">
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          aria-label="Löschen bestätigen"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          <CheckIcon />
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Abbrechen"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
        >
          <CloseIconSm />
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onAsk}
      aria-label="Lead löschen"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 bg-white text-ink-muted shadow-sm transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
    >
      <CloseIcon />
    </button>
  );
}
