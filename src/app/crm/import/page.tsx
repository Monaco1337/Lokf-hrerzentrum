import { RoadmapPage } from "@/features/fairtrain-funnel/crm/admin/RoadmapPage";

export const dynamic = "force-dynamic";

export default function LeadImportPage() {
  return (
    <RoadmapPage
      eyebrow="Administration"
      title="Lead Import"
      intent='Batch-Import von Leads aus CSV/XLSX — mit Spalten-Mapping, Vorschau, Dublettenprüfung und einmaligem Rollback. Importierte Leads landen in der Pipeline mit Quelle "Import" und Status "Neu eingegangen".'
      roadmap={[
        {
          label: "Drag & Drop Upload",
          detail:
            "CSV oder XLSX direkt einwerfen. Erste 10 Zeilen werden zur Spalten-Erkennung gelesen.",
        },
        {
          label: "Spalten-Mapping",
          detail:
            "Per Auswahl jede Quellspalte einem Feld zuordnen (Vorname, Nachname, E-Mail, Telefon, Stadt, Quelle …). Mappings werden gespeichert für Wiederverwendung.",
        },
        {
          label: "Vorschau & Validierung",
          detail:
            "Live-Validierung pro Zeile gegen die Zod-Schemas. Fehlerhafte Zeilen werden separat ausgewiesen, der Rest ist importierbar.",
        },
        {
          label: "Dublettenprüfung",
          detail:
            "E-Mail- und Telefon-Hash gegen bestehenden Bestand abgeglichen — Optionen: überspringen / aktualisieren / als neu anlegen.",
        },
        {
          label: "Import-Protokoll & Rollback",
          detail:
            "Jeder Lauf bekommt eine Batch-ID. Alle erzeugten Leads sind im Protokoll einsehbar und können gemeinsam rückgängig gemacht werden.",
        },
        {
          label: "Automatische Pipeline-Übernahme",
          detail:
            'Neuimporte starten mit Status "Neu eingegangen", Quelle "Import" und werden in die übliche Bearbeitungs-Queue eingespeist.',
        },
      ]}
      related={[
        { href: "/crm/leads", label: "Alle Leads" },
        { href: "/crm/settings", label: "Demo-Daten / Einstellungen" },
      ]}
    />
  );
}
