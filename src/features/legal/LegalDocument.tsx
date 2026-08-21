/**
 * Shared renderer for the legal pages (Impressum · Datenschutzerklärung · AGB).
 *
 * A data-driven document model keeps the (very long) legal copy declarative and
 * easy to maintain, while the renderer applies the brand's premium light design
 * system (ink/accent/surface tokens, hairline borders, soft shadows) so the
 * legal pages read as one publication with the rest of the site.
 *
 * Features:
 *   - Auto-numbered sections with stable `#id` anchors + a linked table of
 *     contents ("Inhaltsverzeichnis").
 *   - Rich block set: paragraphs, bullet/numbered lists, sub-headings,
 *     definition rows (key/value — e.g. Impressum data) and highlighted notes.
 *   - Lightweight inline emphasis: wrap text in **double asterisks** for bold.
 */
import type { ReactNode } from "react";

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "h3"; text: string }
  | { kind: "note"; title: string; text: string }
  | { kind: "dl"; rows: Array<{ k: string; v: string }> };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocumentData {
  /** Human-readable "last updated" stamp shown under the title. */
  updated: string;
  sections: ReadonlyArray<LegalSection>;
}

/** Split a string on **bold** markers and render <strong> for the bold parts. */
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-navy-950">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="text-[15px] leading-[1.75] text-ink-soft">
          {renderInline(block.text)}
        </p>
      );
    case "h3":
      return (
        <h3 className="mt-2 text-[16px] font-bold tracking-tight text-navy-950">
          {renderInline(block.text)}
        </h3>
      );
    case "list":
      return (
        <ul className="space-y-2 pl-1">
          {block.items.map((it, i) => (
            <li
              key={i}
              className="relative pl-5 text-[15px] leading-[1.7] text-ink-soft"
            >
              <span
                aria-hidden
                className="absolute left-0 top-[0.6em] h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent-500"
              />
              {renderInline(it)}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="space-y-2 pl-1">
          {block.items.map((it, i) => (
            <li
              key={i}
              className="relative pl-7 text-[15px] leading-[1.7] text-ink-soft"
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-navy-950 text-[10.5px] font-bold text-white"
              >
                {i + 1}
              </span>
              {renderInline(it)}
            </li>
          ))}
        </ol>
      );
    case "note":
      return (
        <div className="rounded-2xl border border-accent-200/70 bg-accent-50/60 p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-accent-800">
            {block.title}
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
            {renderInline(block.text)}
          </p>
        </div>
      );
    case "dl":
      return (
        <dl className="overflow-hidden rounded-2xl border border-ink/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {block.rows.map((row, i) => (
            <div
              key={i}
              className="flex flex-col gap-0.5 border-b border-ink/[0.06] px-5 py-3.5 last:border-0 sm:flex-row sm:gap-6"
            >
              <dt className="w-full text-[12px] font-semibold uppercase tracking-wider text-ink-muted sm:w-56 sm:shrink-0">
                {row.k}
              </dt>
              <dd className="text-[15px] leading-[1.6] text-navy-950">
                {renderInline(row.v)}
              </dd>
            </div>
          ))}
        </dl>
      );
    default:
      return null;
  }
}

export function LegalDocument({ data }: { data: LegalDocumentData }) {
  return (
    <div className="space-y-10">
      {/* Inhaltsverzeichnis */}
      <nav
        aria-label="Inhaltsverzeichnis"
        className="rounded-2xl border border-ink/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-7"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-700">
          Inhalt
        </p>
        <p className="mt-2 text-[12.5px] text-ink-muted">
          Stand: {data.updated}
        </p>
        <ol className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {data.sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="group flex gap-2.5 text-[14px] leading-snug text-ink-soft transition hover:text-navy-950"
              >
                <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-accent-700">
                  {i + 1}
                </span>
                <span className="group-hover:underline">{s.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Abschnitte */}
      <div className="space-y-11">
        {data.sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <div className="mb-4 flex items-baseline gap-3">
              <span className="font-display text-[15px] font-extrabold tabular-nums text-accent-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="font-display text-[21px] font-extrabold leading-tight tracking-tight text-navy-950 sm:text-[24px]">
                {s.title}
              </h2>
            </div>
            <div className="space-y-4 border-l border-ink/[0.06] pl-4 sm:pl-6">
              {s.blocks.map((b, bi) => (
                <Block key={bi} block={b} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
