import { redirect } from "next/navigation";

import { FairtrainLogo } from "@/features/fairtrain-funnel/components/FairtrainLogo";
import { requireCrmUser } from "@/server/actions/_helpers";
import { crmLogin } from "@/server/actions/crmAuth";

export default async function CrmLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const params = await searchParams;

  // Already authenticated? Bounce straight to the dashboard so users
  // don't see a stale login form (and the previous-session chrome).
  let hasSession = false;
  try {
    await requireCrmUser();
    hasSession = true;
  } catch {
    /* No (valid) session — fall through and render the form. */
  }
  if (hasSession) redirect("/crm");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="card w-full max-w-sm p-8">
        <FairtrainLogo className="h-12 w-auto" />
        <h1 className="mt-6 text-xl font-semibold text-ink">CRM-Login</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Geschützter Bereich. Bitte mit dem CRM-Passwort anmelden.
        </p>
        <form action={crmLogin} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">E-Mail</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              autoComplete="username"
              placeholder="dennis@fairtrain.local"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Passwort</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              autoComplete="current-password"
              required
            />
          </div>
          {params.error === "credentials" ? (
            <p className="text-sm text-danger">Anmeldedaten ungültig.</p>
          ) : params.error === "invalid" ? (
            <p className="text-sm text-danger">Ungültige Eingabe.</p>
          ) : params.error ? (
            <p className="text-sm text-danger">Anmeldung fehlgeschlagen.</p>
          ) : null}
          <button type="submit" className="btn-primary w-full">Anmelden</button>
        </form>
        <p className="mt-6 text-xs text-ink-muted">
          Initiale Super-Admins: <strong>dennis@fairtrain.local</strong> und{" "}
          <strong>admin@fairtrain.local</strong>. Im Dev-Modus ohne
          konfiguriertes Passwort genügt &quot;dev&quot; mit leerer E-Mail.
        </p>
      </div>
    </div>
  );
}
