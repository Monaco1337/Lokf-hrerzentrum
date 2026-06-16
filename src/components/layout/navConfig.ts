/**
 * Shared navigation configuration for the public site (Navbar, MobileNavbar,
 * Footer). Single source of truth so links never drift between surfaces.
 */
export interface NavLink {
  /** Anchor id of the landing section the link scrolls to. */
  id: string;
  label: string;
}

export const NAV_LINKS: ReadonlyArray<NavLink> = [
  { id: "weg", label: "So funktioniert es" },
  { id: "standorte", label: "Standorte" },
  { id: "foerderung", label: "Förderung" },
  { id: "faq", label: "FAQ" },
];

/**
 * Section whose top edge triggers the navbar to reveal itself. The hero is
 * intentionally chrome-less — the navbar only fades + slides in once the
 * second section (the audience block) reaches the top of the viewport.
 */
export const NAVBAR_SCROLL_TRIGGER_ID = "zielgruppen";

/** Effective visual height of the navbar at the top of the page. */
export const NAVBAR_TOP_OFFSET = 72;

/** Primary CTA target. */
export const PRIMARY_CTA_HREF = "/eligibility";
export const PRIMARY_CTA_LABEL = "Eignungscheck starten";

/** WhatsApp contact target (placeholder until prod number is wired in). */
export const WHATSAPP_HREF = "https://wa.me/4915000000000";
