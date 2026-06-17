"use client";
/**
 * Modal — lightweight, dependency-free dialog in the premium light CRM theme.
 *
 * Mirrors the existing TaskEditor overlay behaviour (backdrop click + Escape to
 * close, focus trap-lite) but styled for the light surface used across the lead
 * management screens. Kept intentionally small so every new editing surface can
 * reuse one consistent dialog instead of re-implementing overlays.
 */
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`my-auto w-full ${SIZE[size]} rounded-2xl border border-ink/10 bg-white shadow-premium ring-1 ring-ink/[0.02]`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink/[0.07] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-navy-950">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[12.5px] text-ink-soft">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-ink/[0.07] px-5 py-3.5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
