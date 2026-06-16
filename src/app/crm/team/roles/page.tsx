import { redirect } from "next/navigation";

import { PERMISSIONS, can } from "@/features/fairtrain-funnel/auth/permissions";
import {
  ROLE_LABEL,
  Role,
  type Role as RoleType,
} from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";

export const dynamic = "force-dynamic";

const PERMISSION_LABEL: Record<string, string> = {
  canManageUsers: "Nutzer verwalten",
  canCreateUsers: "Nutzer anlegen",
  canDeleteUsers: "Nutzer löschen",
  canAssignRoles: "Rollen vergeben",
  canManageLeads: "Leads bearbeiten",
  canDeleteLeads: "Leads löschen",
  canViewAllLeads: "Alle Leads sehen",
  canAssignLeads: "Leads zuweisen",
  canEditLeadStatus: "Lead-Status ändern",
  canCreateNotes: "Notizen erstellen",
  canCreateTasks: "Aufgaben erstellen",
  canTrackCalls: "Anrufe dokumentieren",
  canManageSettings: "Einstellungen verwalten",
  canManageAutomations: "Automationen verwalten",
  canManagePipeline: "Pipeline verwalten",
  canViewAnalytics: "Reports & KPIs sehen",
  canRevealSensitive: "Sensible Daten einsehen",
  canDeleteContactInquiries: "Anfragen löschen",
  canEditContactInquiries: "Anfragen bearbeiten",
  canViewAuditLog: "Audit-Log sehen",
};

const ROLES: ReadonlyArray<RoleType> = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.PARTNER_MANAGER,
  Role.PARTNER_AGENT,
  Role.READ_ONLY,
];

export default async function RolesPage() {
  const currentUser = await requireCrmUser();
  if (!can(currentUser.role, "canAssignRoles")) redirect("/crm");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Team
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-950">Rollen-Matrix</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Alle Rollen × Berechtigungen — eine Spalte je Rolle, eine Zeile je
          Berechtigung. Die Matrix ist die einzige Quelle der Wahrheit für
          alle UI- und Backend-Checks.
        </p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead className="bg-surface-subtle/70 text-[11px] uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Berechtigung</th>
              {ROLES.map((r) => (
                <th
                  key={r}
                  className="px-4 py-2.5 text-center font-semibold"
                >
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {PERMISSIONS.map((p) => (
              <tr key={p}>
                <td className="px-4 py-2 font-medium text-navy-950">
                  {PERMISSION_LABEL[p] ?? p}
                </td>
                {ROLES.map((r) => {
                  const ok = can(r, p);
                  return (
                    <td key={r} className="px-4 py-2 text-center">
                      <span
                        className={[
                          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                          ok
                            ? "bg-accent-50 text-accent-900 ring-1 ring-inset ring-accent-200"
                            : "bg-surface-muted text-ink-muted ring-1 ring-inset ring-ink/10",
                        ].join(" ")}
                        aria-label={ok ? "erlaubt" : "verboten"}
                      >
                        {ok ? "✓" : "·"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11.5px] text-ink-muted">
        Änderungen erfolgen ausschließlich pro Mitarbeiter unter{" "}
        <a href="/crm/users" className="text-brand-700 hover:underline">
          Mitarbeiter
        </a>{" "}
        — die Matrix selbst ist im Code festgelegt.
      </p>
    </div>
  );
}
