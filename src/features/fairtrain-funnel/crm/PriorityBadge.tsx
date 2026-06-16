import type { LeadPriority } from "../types";
import { PriorityPill } from "./StatusPill";

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  return <PriorityPill priority={priority} />;
}
