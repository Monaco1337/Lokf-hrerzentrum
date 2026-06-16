import type {
  AutomationLogEntry,
  AutomationTemplateEntry,
  ConsentState,
} from "../types";

import { LeadAutomationPanel } from "./LeadAutomationPanel";
import { consentLabel } from "./leadLabels";
import { SectionCard } from "./LeadFacts";

export function LeadConsentSection({ consents }: { consents: ConsentState[] }) {
  return (
    <SectionCard title="Einwilligungen (DSGVO)">
      <ul className="grid gap-2 sm:grid-cols-2">
        {consents.map((c) => (
          <li
            key={c.type}
            className="flex items-center justify-between gap-3 rounded-lg border border-ink/[0.06] px-3 py-2"
          >
            <span className="flex items-center gap-2 text-sm text-ink">
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  c.granted ? "bg-emerald-500" : "bg-slate-300",
                ].join(" ")}
              />
              {consentLabel(c.type)}
            </span>
            <span
              className={[
                "text-xs font-medium",
                c.granted ? "text-emerald-700" : "text-ink-muted",
              ].join(" ")}
            >
              {c.granted ? "Erteilt" : "Nicht erteilt"}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function LeadAutomationSection({
  leadId,
  logs,
  templates,
}: {
  leadId: string;
  logs: AutomationLogEntry[];
  templates: AutomationTemplateEntry[];
}) {
  return (
    <SectionCard title="Automatische Kontaktaufnahme">
      <LeadAutomationPanel
        leadId={leadId}
        logs={logs}
        templates={templates.filter((t) => t.trigger === "LEAD_CREATED")}
      />
    </SectionCard>
  );
}
