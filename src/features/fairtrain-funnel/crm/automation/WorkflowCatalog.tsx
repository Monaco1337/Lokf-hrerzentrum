"use client";
/**
 * WorkflowCatalog — UI primitives for the workflow studio catalog:
 *   • WorkflowIcon   — maps registry icon keys → SVGs
 *   • ModeSwitch     — Einfach / Professional / Enterprise segmented control
 *   • CatalogPicker  — searchable, grouped, favoritable trigger/condition/action
 *                      picker (replaces the flat <select> dropdowns)
 *
 * All data comes from the generic registry — nothing here is lead-specific.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  type CatalogEntry,
  type CatalogKind,
  findEntry,
  groupedCatalog,
  type WorkflowIconKey,
  type WorkflowTier,
  type WorkflowTone,
} from "../../automation/workflow";

// ── icons ─────────────────────────────────────────────────────────────────────

type IC = React.SVGProps<SVGSVGElement>;
const ic = (d: React.ReactNode) =>
  function Icon(p: IC) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...p}
      >
        {d}
      </svg>
    );
  };

const ICONS: Record<WorkflowIconKey, (p: IC) => React.ReactElement> = {
  bolt: ic(<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />),
  user: ic(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  userPlus: ic(<><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M19 8v6M22 11h-6" /></>),
  import: ic(<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>),
  trophy: ic(<><path d="M8 21h8M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" /></>),
  x: ic(<><path d="M18 6 6 18M6 6l12 12" /></>),
  chat: ic(<path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />),
  check2: ic(<><path d="m2 12 5 5" /><path d="m8 12 5 5L22 7" /></>),
  mail: ic(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 7 10-7" /></>),
  link: ic(<><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>),
  reply: ic(<><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></>),
  calendar: ic(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  calendarCheck: ic(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m9 16 2 2 4-4" /></>),
  calendarX: ic(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m10 15 4 4M14 15l-4 4" /></>),
  clock: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  doc: ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>),
  docMissing: ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M12 18h.01" /></>),
  docCheck: ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" /></>),
  swap: ic(<><path d="M7 4 3 8l4 4" /><path d="M3 8h14a4 4 0 0 1 0 8h-2" /></>),
  pipeline: ic(<><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="17" y="4" width="4" height="6" rx="1" /></>),
  gauge: ic(<><path d="M12 14 15 9" /><circle cx="12" cy="14" r="8" /><path d="M4 20h16" /></>),
  funnel: ic(<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />),
  consent: ic(<><path d="M9 12l2 2 4-4" /><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" /></>),
  flag: ic(<><path d="M4 22V4h13l-2 4 2 4H4" /></>),
  task: ic(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m9 12 2 2 4-4" /></>),
  note: ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M8 12h8M8 16h5" /></>),
  arrow: ic(<><path d="M5 12h14M12 5l7 7-7 7" /></>),
  sms: ic(<><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></>),
  push: ic(<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>),
  webhook: ic(<><circle cx="12" cy="8" r="3" /><path d="M12 11v4a4 4 0 1 1-4 4" /><path d="M14 15h4a4 4 0 1 1-4 4" /></>),
  http: ic(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>),
  code: ic(<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>),
  ai: ic(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle cx="12" cy="12" r="4" /></>),
  slack: ic(<><rect x="10" y="3" width="4" height="10" rx="2" /><rect x="3" y="10" width="10" height="4" rx="2" /></>),
  sparkles: ic(<><path d="M12 3l1.9 4.6L18 9.5l-4.1 1.9L12 16l-1.9-4.6L6 9.5l4.1-1.9z" /></>),
};

export function WorkflowIcon({ name, className }: { name: WorkflowIconKey; className?: string }) {
  const Cmp = ICONS[name] ?? ICONS.bolt;
  return <Cmp className={className} />;
}

// ── tone classes ────────────────────────────────────────────────────────────

interface ToneCls {
  iconBg: string;
  iconText: string;
  chip: string;
  accent: string;
}
const TONES: Record<WorkflowTone, ToneCls> = {
  indigo: { iconBg: "bg-indigo-50", iconText: "text-indigo-600", chip: "bg-indigo-50 text-indigo-700 ring-indigo-200", accent: "border-indigo-400" },
  emerald: { iconBg: "bg-emerald-50", iconText: "text-emerald-600", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", accent: "border-emerald-500" },
  amber: { iconBg: "bg-amber-50", iconText: "text-amber-600", chip: "bg-amber-50 text-amber-700 ring-amber-200", accent: "border-amber-400" },
  blue: { iconBg: "bg-blue-50", iconText: "text-blue-600", chip: "bg-blue-50 text-blue-700 ring-blue-200", accent: "border-blue-400" },
  violet: { iconBg: "bg-violet-50", iconText: "text-violet-600", chip: "bg-violet-50 text-violet-700 ring-violet-200", accent: "border-violet-500" },
  slate: { iconBg: "bg-slate-100", iconText: "text-slate-600", chip: "bg-slate-100 text-slate-600 ring-slate-200", accent: "border-slate-400" },
  rose: { iconBg: "bg-rose-50", iconText: "text-rose-600", chip: "bg-rose-50 text-rose-700 ring-rose-200", accent: "border-rose-400" },
  teal: { iconBg: "bg-teal-50", iconText: "text-teal-600", chip: "bg-teal-50 text-teal-700 ring-teal-200", accent: "border-teal-500" },
  sky: { iconBg: "bg-sky-50", iconText: "text-sky-600", chip: "bg-sky-50 text-sky-700 ring-sky-200", accent: "border-sky-400" },
  fuchsia: { iconBg: "bg-fuchsia-50", iconText: "text-fuchsia-600", chip: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200", accent: "border-fuchsia-400" },
};

export function toneClasses(tone: WorkflowTone): ToneCls {
  return TONES[tone] ?? TONES.slate;
}

// ── ModeSwitch ────────────────────────────────────────────────────────────────

const MODES: Array<{ id: WorkflowTier; label: string; hint: string }> = [
  { id: "simple", label: "Einfach", hint: "Schritt für Schritt – ideal für 95 % aller Fälle" },
  { id: "pro", label: "Professional", hint: "Bedingungen, Wartezeiten, Verzweigungen" },
  { id: "enterprise", label: "Enterprise", hint: "Voller Flow-Builder, KI, HTTP, Webhooks" },
];

export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: WorkflowTier;
  onChange: (m: WorkflowTier) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-xl bg-surface-subtle p-0.5 ring-1 ring-ink/[0.06]"
      role="tablist"
      aria-label="Modus"
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={mode === m.id}
          title={m.hint}
          onClick={() => onChange(m.id)}
          className={[
            "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition",
            mode === m.id
              ? "bg-white text-navy-950 shadow-sm ring-1 ring-ink/[0.05]"
              : "text-ink-muted hover:text-ink",
          ].join(" ")}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ── favorites (localStorage) ──────────────────────────────────────────────────

function favKey(kind: CatalogKind): string {
  return `wf.favorites.${kind}`;
}

function useFavorites(kind: CatalogKind): {
  favorites: string[];
  toggle: (id: string) => void;
} {
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(favKey(kind));
      if (raw) setFavorites(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, [kind]);
  function toggle(id: string) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        window.localStorage.setItem(favKey(kind), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }
  return { favorites, toggle };
}

// ── CatalogPicker ─────────────────────────────────────────────────────────────

const KIND_PLACEHOLDER: Record<CatalogKind, string> = {
  trigger: "Auslöser suchen …",
  condition: "Bedingung suchen …",
  action: "Aktion suchen …",
};

interface PanelPos {
  left: number;
  width: number;
  placement: "top" | "bottom";
  /** `top` px for bottom placement, `bottom` px for top placement. */
  offset: number;
  /** Max height for the scrollable list area. */
  listMaxHeight: number;
}

/**
 * Position the popover as a viewport-fixed panel: aligned to the field, flipped
 * above when there isn't room below, and clamped inside the viewport. This
 * escapes the node card's `overflow-hidden` so the menu is never clipped.
 */
function computePanelPos(rect: DOMRect): PanelPos {
  const margin = 8;
  const headerH = 60; // search box height
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const width = Math.min(Math.max(rect.width, 320), vw - margin * 2);
  const left = Math.min(Math.max(margin, rect.left), vw - width - margin);

  const spaceBelow = vh - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const preferBottom = spaceBelow >= 300 || spaceBelow >= spaceAbove;

  const avail = preferBottom ? spaceBelow : spaceAbove;
  const listMaxHeight = Math.max(180, Math.min(380, avail - headerH));

  return preferBottom
    ? { left, width, placement: "bottom", offset: rect.bottom + margin, listMaxHeight }
    : { left, width, placement: "top", offset: vh - rect.top + margin, listMaxHeight };
}

export function CatalogPicker({
  kind,
  value,
  mode,
  onSelect,
}: {
  kind: CatalogKind;
  value: string;
  mode: WorkflowTier;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<PanelPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { favorites, toggle } = useFavorites(kind);

  const selected = findEntry(kind, value);

  const groups = useMemo(
    () => groupedCatalog(kind, { mode, query }),
    [kind, mode, query],
  );
  const favEntries = useMemo(
    () =>
      groups
        .flatMap((g) => g.entries)
        .filter((e) => favorites.includes(e.id) && !e.comingSoon),
    [groups, favorites],
  );

  const reposition = useCallback(() => {
    const btn = triggerRef.current;
    if (btn) setPos(computePanelPos(btn.getBoundingClientRect()));
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", reposition);
    // Capture phase catches scrolling of the canvas container, not just window.
    window.addEventListener("scroll", reposition, true);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      cancelAnimationFrame(id);
    };
  }, [open, reposition]);

  function choose(entry: CatalogEntry) {
    if (entry.comingSoon) return;
    onSelect(entry.id);
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-left transition hover:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
      >
        {selected ? (
          <SelectedFace entry={selected} />
        ) : (
          <span className="text-[13px] text-ink-muted">Auswählen …</span>
        )}
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: "fixed",
                left: pos.left,
                width: pos.width,
                ...(pos.placement === "top" ? { bottom: pos.offset } : { top: pos.offset }),
              }}
              className="z-[120] overflow-hidden rounded-2xl border border-ink/[0.08] bg-white shadow-[0_16px_48px_-12px_rgba(15,23,42,0.28)]"
            >
              <div className="border-b border-ink/[0.06] p-2">
                <div className="flex items-center gap-2 rounded-xl bg-surface-subtle px-3 py-2">
                  <SearchIcon className="h-4 w-4 shrink-0 text-ink-muted" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={KIND_PLACEHOLDER[kind]}
                    className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted"
                  />
                </div>
              </div>

              <div className="overflow-y-auto p-1.5" style={{ maxHeight: pos.listMaxHeight }}>
                {favEntries.length > 0 && !query ? (
                  <Group label="Favoriten">
                    {favEntries.map((e) => (
                      <Row
                        key={`fav-${e.id}`}
                        entry={e}
                        active={e.id === value}
                        fav={favorites.includes(e.id)}
                        onChoose={() => choose(e)}
                        onToggleFav={() => toggle(e.id)}
                      />
                    ))}
                  </Group>
                ) : null}

                {groups.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[13px] text-ink-muted">
                    Nichts gefunden.
                  </p>
                ) : (
                  groups.map((g) => (
                    <Group key={g.category} label={g.category}>
                      {g.entries.map((e) => (
                        <Row
                          key={e.id}
                          entry={e}
                          active={e.id === value}
                          fav={favorites.includes(e.id)}
                          onChoose={() => choose(e)}
                          onToggleFav={() => toggle(e.id)}
                        />
                      ))}
                    </Group>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function SelectedFace({ entry }: { entry: CatalogEntry }) {
  const tone = toneClasses(entry.tone);
  return (
    <>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.iconBg}`}>
        <WorkflowIcon name={entry.icon} className={`h-4 w-4 ${tone.iconText}`} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-semibold text-navy-950">
          {entry.label}
        </span>
        <span className="block truncate text-[11.5px] text-ink-muted">{entry.category}</span>
      </span>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

function Row({
  entry,
  active,
  fav,
  onChoose,
  onToggleFav,
}: {
  entry: CatalogEntry;
  active: boolean;
  fav: boolean;
  onChoose: () => void;
  onToggleFav: () => void;
}) {
  const tone = toneClasses(entry.tone);
  const disabled = Boolean(entry.comingSoon);
  return (
    <div
      className={[
        "group flex items-center gap-2.5 rounded-xl px-2 py-2 transition",
        disabled ? "opacity-60" : "cursor-pointer hover:bg-surface-subtle",
        active ? "bg-brand-50 ring-1 ring-brand-200" : "",
      ].join(" ")}
      onClick={disabled ? undefined : onChoose}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.iconBg}`}>
        <WorkflowIcon name={entry.icon} className={`h-4 w-4 ${tone.iconText}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-navy-950">{entry.label}</span>
          {disabled ? (
            <span className="rounded-full bg-slate-100 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
              Bald
            </span>
          ) : null}
        </span>
        <span className="block truncate text-[11.5px] text-ink-muted">{entry.description}</span>
      </span>
      {!disabled ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav();
          }}
          aria-label={fav ? "Aus Favoriten entfernen" : "Zu Favoriten"}
          className={[
            "rounded-lg p-1 transition",
            fav ? "text-amber-500" : "text-ink-muted opacity-0 hover:text-amber-500 group-hover:opacity-100",
          ].join(" ")}
        >
          <StarIcon className="h-4 w-4" filled={fav} />
        </button>
      ) : null}
    </div>
  );
}

// ── small icons ────────────────────────────────────────────────────────────────

const ChevronDown = ic(<polyline points="6 9 12 15 18 9" />);
const SearchIcon = ic(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>);
function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9" />
    </svg>
  );
}
