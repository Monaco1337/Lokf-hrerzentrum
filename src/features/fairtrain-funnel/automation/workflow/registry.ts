/**
 * Workflow Registry — the generic, plugin-based catalog that powers the
 * workflow studio.
 *
 * ARCHITECTURE (per product direction): the editor is fully decoupled from the
 * domain objects. The builder only ever reads catalog entries from this
 * registry — it never hard-codes leads/applicants/customers. Each domain
 * (leads today; Bewerber, Kunden, Rechnungen later) ships a `WorkflowPlugin`
 * that contributes its own triggers, conditions and actions. Adding a module
 * later means registering one more plugin — the builder does not change.
 *
 * COMPATIBILITY: every catalog entry's `id` is EXACTLY the string persisted in
 * the existing `AutomationRule` JSON (e.g. "LEAD_CREATED", "createTask",
 * "hasWhatsappConsent"). This layer is metadata only — it changes nothing about
 * how rules are stored or evaluated, so existing automations keep working.
 */

export type WorkflowTier = "simple" | "pro" | "enterprise";
export type CatalogKind = "trigger" | "condition" | "action";

/** Color tokens — mapped to Tailwind classes in the UI layer. */
export type WorkflowTone =
  | "indigo"
  | "emerald"
  | "amber"
  | "blue"
  | "violet"
  | "slate"
  | "rose"
  | "teal"
  | "sky"
  | "fuchsia";

/** Icon keys — mapped to SVGs in the UI layer (keeps this module data-only). */
export type WorkflowIconKey =
  | "bolt"
  | "user"
  | "userPlus"
  | "import"
  | "trophy"
  | "x"
  | "chat"
  | "check2"
  | "mail"
  | "link"
  | "reply"
  | "calendar"
  | "calendarCheck"
  | "calendarX"
  | "clock"
  | "doc"
  | "docMissing"
  | "docCheck"
  | "swap"
  | "pipeline"
  | "gauge"
  | "funnel"
  | "consent"
  | "flag"
  | "task"
  | "note"
  | "arrow"
  | "sms"
  | "push"
  | "webhook"
  | "http"
  | "code"
  | "ai"
  | "slack"
  | "sparkles";

/** How a condition captures its comparison value (drives the value widget). */
export type ValueKind =
  | "none"
  | "text"
  | "number"
  | "hours"
  | "leadStatus"
  | "priority"
  | "situation";

/** Which config widget an action needs (drives the action config form). */
export type ConfigKind =
  | "none"
  | "template"
  | "taskTitle"
  | "status"
  | "owner"
  | "hours"
  | "note";

export interface CatalogEntry {
  kind: CatalogKind;
  /** Persisted enum string — MUST match the existing AutomationRule vocabulary. */
  id: string;
  label: string;
  description: string;
  /** Group heading shown in the picker, e.g. "Leads", "Kommunikation". */
  category: string;
  icon: WorkflowIconKey;
  tone: WorkflowTone;
  /** Extra terms for fuzzy search (synonyms, English, abbreviations). */
  keywords: string[];
  /** Minimum mode in which this entry is offered. */
  tier: WorkflowTier;
  /** Owning plugin id (e.g. "leads"). */
  plugin: string;
  /** Conditions: value widget. Undefined = no value. */
  valueKind?: ValueKind;
  /** Actions: config widget. Undefined = no config. */
  configKind?: ConfigKind;
  /**
   * Visible but not yet executable (roadmap connectors). Rendered disabled with
   * a "Bald" badge — never selectable/persistable, so nothing can break.
   */
  comingSoon?: boolean;
}

export interface WorkflowPlugin {
  id: string;
  label: string;
  triggers: CatalogEntry[];
  conditions: CatalogEntry[];
  actions: CatalogEntry[];
}

const TIER_RANK: Record<WorkflowTier, number> = {
  simple: 0,
  pro: 1,
  enterprise: 2,
};

/** An entry is visible in `mode` when its tier is at or below the active mode. */
export function entryVisibleInTier(entry: CatalogEntry, mode: WorkflowTier): boolean {
  return TIER_RANK[entry.tier] <= TIER_RANK[mode];
}

// ── registry ────────────────────────────────────────────────────────────────

const plugins: WorkflowPlugin[] = [];

/** Register a domain plugin. Idempotent by plugin id (last wins). */
export function registerWorkflowPlugin(plugin: WorkflowPlugin): void {
  const idx = plugins.findIndex((p) => p.id === plugin.id);
  if (idx >= 0) plugins.splice(idx, 1, plugin);
  else plugins.push(plugin);
}

export function listPlugins(): ReadonlyArray<WorkflowPlugin> {
  return plugins;
}

function collect(kind: CatalogKind): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  for (const p of plugins) {
    const bucket =
      kind === "trigger" ? p.triggers : kind === "condition" ? p.conditions : p.actions;
    out.push(...bucket);
  }
  return out;
}

/** All entries of a kind, optionally filtered to the active mode. */
export function catalog(kind: CatalogKind, mode?: WorkflowTier): CatalogEntry[] {
  const all = collect(kind);
  return mode ? all.filter((e) => entryVisibleInTier(e, mode)) : all;
}

export function findEntry(kind: CatalogKind, id: string): CatalogEntry | undefined {
  return collect(kind).find((e) => e.id === id);
}

export interface CatalogGroup {
  category: string;
  entries: CatalogEntry[];
}

/** Case/diacritic-insensitive contains match across label/description/keywords. */
function matches(entry: CatalogEntry, query: string): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [entry.label, entry.description, entry.category, ...entry.keywords]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

/**
 * Entries of a kind, filtered by mode + search query, grouped by category.
 * Groups preserve first-seen category order; empty groups are dropped.
 */
export function groupedCatalog(
  kind: CatalogKind,
  opts: { mode: WorkflowTier; query?: string } = { mode: "enterprise" },
): CatalogGroup[] {
  const query = opts.query ?? "";
  const entries = catalog(kind, opts.mode).filter((e) => matches(e, query));
  const order: string[] = [];
  const byCat = new Map<string, CatalogEntry[]>();
  for (const e of entries) {
    if (!byCat.has(e.category)) {
      byCat.set(e.category, []);
      order.push(e.category);
    }
    byCat.get(e.category)!.push(e);
  }
  return order.map((category) => ({ category, entries: byCat.get(category)! }));
}
