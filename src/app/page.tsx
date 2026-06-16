import type { Metadata } from "next";

import { FairtrainLandingPage } from "@/features/fairtrain-funnel/components/FairtrainLandingPage";

export const metadata: Metadata = {
  title: "Lokführer werden mit geförderter Weiterbildung",
  description:
    "Lokführerzentrum.de — In wenigen Minuten prüfen: Bist du geeignet für die 15-monatige Lokführer-Weiterbildung? Bildungsgutschein der Agentur für Arbeit möglich, Standorte Berlin und Saalfeld.",
  alternates: { canonical: "/" },
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Muss ich arbeitslos sein, um teilnehmen zu können?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nein. Arbeitslose, arbeitssuchende und Beschäftigte können teilnehmen. Der Förderweg unterscheidet sich je nach Situation — wir prüfen das individuell mit dir.",
      },
    },
    {
      "@type": "Question",
      name: "Was ist ein Bildungsgutschein?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ein Gutschein der Agentur für Arbeit oder des Jobcenters, der die Kosten einer zertifizierten Weiterbildung übernehmen kann. Die Entscheidung trifft der zuständige Sachbearbeiter im persönlichen Termin.",
      },
    },
    {
      "@type": "Question",
      name: "Wer entscheidet über die Förderung?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ausschließlich die Agentur für Arbeit bzw. das Jobcenter — basierend auf deiner persönlichen Situation und den vorgelegten Unterlagen. Wir bereiten dich auf den Termin vor und stellen die komplette Mappe mit dir zusammen.",
      },
    },
    {
      "@type": "Question",
      name: "Was passiert nach dem Eignungscheck?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Du bekommst eine kurze Rückmeldung. Bei guter Eignung melden wir uns persönlich und besprechen die nächsten Schritte mit dir.",
      },
    },
    {
      "@type": "Question",
      name: "Welche Unterlagen brauche ich für den Termin?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Persönliche Begründung, Lebenslauf, Einstellungszusage, Maßnahme-Angebot, Maßnahmebogen sowie Angebote für den psychologischen Eignungstest und die medizinische Tauglichkeitsuntersuchung. Alles erstellen wir gemeinsam mit dir — du musst nichts allein vorbereiten.",
      },
    },
    {
      "@type": "Question",
      name: "Kann ich teilnehmen, wenn ich noch arbeite?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Es gibt einen geordneten Weg ohne voreilige Kündigung. Wir zeigen dir, wann und wie der Wechsel zur Weiterbildung am sichersten funktioniert.",
      },
    },
    {
      "@type": "Question",
      name: "Wie lange dauert die Weiterbildung?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "15 Monate in Vollzeit, davon ca. 3 Monate praktische Fahrausbildung.",
      },
    },
    {
      "@type": "Question",
      name: "Gibt es eine Garantie auf Förderung?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nein. Die Bewilligung kann niemand garantieren — die Entscheidung liegt ausschließlich bei der Agentur für Arbeit oder dem Jobcenter. Wir maximieren mit dir die Chancen durch beste Vorbereitung.",
      },
    },
    {
      "@type": "Question",
      name: "Werden meine Daten geschützt?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Wir verarbeiten deine Angaben ausschließlich zur Eignungsprüfung und zur Vorbereitung deines Förderantrags. Sensible Angaben werden getrennt gespeichert und nur zur Eignungsbeurteilung verwendet.",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <FairtrainLandingPage />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
    </>
  );
}
