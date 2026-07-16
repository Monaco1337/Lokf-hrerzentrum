/**
 * nextActionCue — turns the computed next-best-action into a concrete UI cue
 * for the Bewerberakte: a label, a reason, a tone, an icon and a target the
 * workspace can act on directly (open a tab or a tel:/wa.me link).
 *
 * This is the "das ist jetzt der nächste Schritt"-Führung: the same engine that
 * drives the leads list (`computeLeadInsights`) decides the step, and the cue
 * maps it onto the workspace so a Vertriebler never has to think about where to
 * work next.
 */
import type { LeadInsights, NextBestAction } from "../intelligence/types";

export type NextActionIcon =
  | "call"
  | "whatsapp"
  | "docs"
  | "calendar"
  | "voucher"
  | "check"
  | "review";

export interface NextActionCue {
  label: string;
  reason: string;
  tone: NextBestAction["tone"];
  icon: NextActionIcon;
  /** Either jump to a workspace tab, or open an external link (tel/wa.me). */
  target: { kind: "tab"; tab: string } | { kind: "href"; href: string };
}

/** Maps the engine's action-kind onto a workspace tab + icon. */
const KIND_TO_TARGET: Record<
  NextBestAction["kind"],
  { tab: string; icon: NextActionIcon }
> = {
  call: { tab: "kommunikation", icon: "call" },
  whatsapp: { tab: "kommunikation", icon: "whatsapp" },
  qualify: { tab: "uebersicht", icon: "review" },
  request_docs: { tab: "unterlagen", icon: "docs" },
  schedule_call: { tab: "termine", icon: "calendar" },
  send_briefing: { tab: "kommunikation", icon: "whatsapp" },
  schedule_aa: { tab: "termine", icon: "calendar" },
  follow_voucher: { tab: "bildungsgutschein", icon: "voucher" },
  confirm_contract: { tab: "uebersicht", icon: "check" },
  confirm_start: { tab: "uebersicht", icon: "check" },
  close_case: { tab: "uebersicht", icon: "check" },
  review: { tab: "timeline", icon: "review" },
  celebrate: { tab: "uebersicht", icon: "check" },
  wait: { tab: "timeline", icon: "review" },
};

export function buildNextActionCue(insights: LeadInsights): NextActionCue {
  const action = insights.nextBestAction;
  const map = KIND_TO_TARGET[action.kind] ?? {
    tab: "uebersicht",
    icon: "review" as const,
  };

  // A tel:/wa.me href always wins over a tab jump — one click to act.
  const target: NextActionCue["target"] = action.href
    ? { kind: "href", href: action.href }
    : { kind: "tab", tab: map.tab };

  return {
    label: action.label,
    reason: action.reason,
    tone: action.tone,
    icon: map.icon,
    target,
  };
}
