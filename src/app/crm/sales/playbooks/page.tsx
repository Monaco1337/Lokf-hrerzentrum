/**
 * Sales playbook library — concrete conversation scripts for every funnel
 * step. These are not stubs: each script is real material the agent can
 * use today. Selection by lead-stage tag.
 */

interface Playbook {
  stage: string;
  title: string;
  opener: string;
  questions: ReadonlyArray<string>;
  objections: ReadonlyArray<{ q: string; a: string }>;
  close: string;
}

const PLAYBOOKS: ReadonlyArray<Playbook> = [
  {
    stage: "Erstkontakt",
    title: "Hot Lead — Erstgespräch",
    opener:
      "Hi, hier ist {{partner}} vom Lokführerzentrum. Wir haben deine Anfrage zur geförderten Lokführer-Weiterbildung erhalten — passt es gerade kurz, dass wir die nächsten Schritte durchgehen?",
    questions: [
      "Was ist dein aktueller beruflicher Stand?",
      "Bist du bei der Agentur für Arbeit gemeldet — arbeitslos oder arbeitssuchend?",
      "Welcher Standort wäre dir lieber: Berlin oder Saalfeld?",
      "Bist du grundsätzlich schichtbereit und reisetauglich?",
    ],
    objections: [
      {
        q: "Ich überlege noch — habe noch keinen Termin bei der AA.",
        a: "Verstanden. Wir bereiten dich vor — du gehst zur AA mit einem fertigen Lebenslauf, einer Begründung und einem Leitfaden in die Hand. Dadurch klappt der Bildungsgutschein in über 90 % der Fälle.",
      },
      {
        q: "Ist das wirklich kostenlos?",
        a: "Ja. Die Kosten der 15-monatigen Weiterbildung trägt vollständig die Agentur für Arbeit über den Bildungsgutschein — und Unterkunft am Standort kann oft mitfinanziert werden.",
      },
    ],
    close:
      "Wenn das soweit passt: Ich schlage vor, wir vereinbaren in den nächsten Tagen einen kurzen Termin, in dem wir deinen Lebenslauf finalisieren. Magst du Dienstag 10:00 oder Mittwoch 14:00 nehmen?",
  },
  {
    stage: "Unterlagen",
    title: "Unterlagen anfordern",
    opener:
      "Hi {{name}}, wir bereiten gerade deine Akte für die AA vor. Mir fehlen noch drei Dinge — wenn du sie heute schickst, sind wir bis morgen komplett startklar.",
    questions: [
      "Lebenslauf — am liebsten als PDF, gerne mit deinem aktuellen Foto.",
      "Personalausweis (Vorder- und Rückseite).",
      "Schulzeugnis oder letzte Beschäftigungsnachweise.",
    ],
    objections: [
      {
        q: "Ich habe gerade nicht alle Dokumente parat.",
        a: "Kein Stress — schick mir, was du hast, der Rest folgt. Wichtig ist, dass die AA sieht: hier ist ein Bewerber, der will und vorbereitet ist.",
      },
    ],
    close:
      "Super, dann sende mir die Sachen am besten direkt per WhatsApp. Ich melde mich, sobald die Akte komplett ist, mit deinem AA-Termin.",
  },
  {
    stage: "AA-Termin",
    title: "AA-Termin koordinieren",
    opener:
      "Hi {{name}}, deine Akte ist komplett. Jetzt geht's um den Termin bei der Agentur — ich begleite dich Schritt für Schritt, du brauchst keine Angst zu haben.",
    questions: [
      "Wann bist du verfügbar — Vor- oder Nachmittag?",
      "Hast du bereits einen Sachbearbeiter?",
      "Welche Fragen erwartest du vom AA — wir besprechen die häufigsten.",
    ],
    objections: [
      {
        q: "Ich hatte schon mal Stress bei der AA.",
        a: "Verstehe ich. Wir bereiten dich auf die typischen Einwände vor — du gehst mit klaren Argumenten rein.",
      },
    ],
    close:
      "Ich blocke dir einen Vorbereitungstermin diese Woche und sende dir den Leitfaden bis dahin per Mail.",
  },
];

export default function PlaybooksPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Vertrieb
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-950">
          Gesprächsleitfäden
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Erprobte Skripte für jede Funnel-Phase — Eröffnung, Fragen,
          Einwandbehandlung, Abschluss.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAYBOOKS.map((p) => (
          <article
            key={p.title}
            className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand-700">
              {p.stage}
            </p>
            <h2 className="mt-1 text-[14.5px] font-semibold text-navy-950">
              {p.title}
            </h2>

            <section className="mt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Eröffnung
              </h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                {p.opener}
              </p>
            </section>

            <section className="mt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Schlüsselfragen
              </h3>
              <ul className="mt-1 space-y-1">
                {p.questions.map((q, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-[12px] text-ink-soft"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-brand-600"
                    />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Einwände & Antworten
              </h3>
              <ul className="mt-2 space-y-2">
                {p.objections.map((o, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-ink/10 bg-surface-subtle/60 px-3 py-2"
                  >
                    <p className="text-[12px] font-semibold text-navy-950">
                      &bdquo;{o.q}&ldquo;
                    </p>
                    <p className="mt-1 text-[12px] text-ink-soft">{o.a}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Abschluss
              </h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                {p.close}
              </p>
            </section>
          </article>
        ))}
      </div>
    </div>
  );
}
