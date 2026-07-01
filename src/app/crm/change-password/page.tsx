/**
 * Forced password change — shown on first login when mustChangePassword = true.
 * Also accessible anytime from the user menu for voluntary password updates.
 */
import { redirect } from "next/navigation";

import { requireCrmUser } from "@/server/actions/_helpers";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await requireCrmUser();
  if (!user.mustChangePassword) {
    // Voluntary access is fine — only redirect away if they somehow land here
    // after having already changed their password (edge case: manual navigation).
    // We still show the form; no redirect needed.
  }
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <h1 className="font-display text-[24px] font-bold text-navy-950">
            {user.mustChangePassword ? "Passwort einrichten" : "Passwort ändern"}
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-muted">
            {user.mustChangePassword
              ? `Willkommen, ${user.name}. Bitte wähle jetzt ein sicheres persönliches Passwort, bevor du weitermachst.`
              : "Gib ein neues Passwort für deinen Account ein."}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-ink/[0.08] bg-white p-7 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)]">
          <ChangePasswordForm userName={user.name} />
        </div>

        <p className="mt-5 text-center text-[12px] text-ink-muted">
          Das Passwort wird sicher verschlüsselt gespeichert (bcrypt·12).
        </p>
      </div>
    </div>
  );
}
