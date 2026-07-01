"use client";
/**
 * ChangePasswordForm — client component with useActionState for the
 * server-side changePassword action.
 */
import { useActionState, useState } from "react";

import { changePassword } from "@/server/actions/changePassword";

export function ChangePasswordForm({ userName }: { userName: string }) {
  const [state, action, pending] = useActionState(changePassword, { error: null });
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-5">
      {/* Rules callout */}
      <div className="rounded-xl bg-surface-subtle/60 px-4 py-3 text-[12.5px] text-ink-muted ring-1 ring-ink/[0.06]">
        <p className="font-semibold text-ink">Anforderungen</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>Mindestens 8 Zeichen</li>
          <li>Keine alten System-Passwörter wiederverwenden</li>
        </ul>
      </div>

      {/* New password */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">
          Neues Passwort
        </label>
        <div className="relative">
          <input
            name="password"
            type={show ? "text" : "password"}
            required
            minLength={8}
            maxLength={200}
            autoComplete="new-password"
            placeholder="Mindestens 8 Zeichen"
            className="input pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-ink"
            tabIndex={-1}
            aria-label={show ? "Passwort verstecken" : "Passwort anzeigen"}
          >
            {show ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Confirm */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">
          Passwort bestätigen
        </label>
        <input
          name="confirm"
          type={show ? "text" : "password"}
          required
          minLength={8}
          maxLength={200}
          autoComplete="new-password"
          placeholder="Passwort wiederholen"
          className="input"
        />
      </div>

      {/* Error */}
      {state.error ? (
        <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-700 ring-1 ring-rose-200">
          {state.error}
        </p>
      ) : null}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-600 py-3 text-[14px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Passwort wird gespeichert …" : "Passwort festlegen & weiter"}
      </button>
    </form>
  );
}
