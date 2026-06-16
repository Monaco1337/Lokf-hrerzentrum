import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";

import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
  preload: true,
});

const FALLBACK_SITE_URL = "https://lokfuehrerzentrum.de";

/**
 * Resolve the canonical site URL from env, tolerating a missing or malformed
 * NEXT_PUBLIC_SITE_URL. A bad value (e.g. an unreplaced "<placeholder>") must
 * never crash `new URL()` during the build's metadata collection.
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return FALLBACK_SITE_URL;
  try {
    return new URL(raw).toString();
  } catch {
    return FALLBACK_SITE_URL;
  }
}

const SITE_URL = resolveSiteUrl();
const SITE_NAME = "Lokführerzentrum.de";
const TITLE_DEFAULT =
  "Lokführerzentrum.de — Geförderte Lokführer-Weiterbildung & Eignungscheck";
const DESCRIPTION =
  "Prüfe in wenigen Minuten, ob du für die 15-monatige Lokführer-Weiterbildung in Berlin oder Saalfeld einen Bildungsgutschein der Agentur für Arbeit erhältst. Kostenlos, unverbindlich, DSGVO-konform.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Lokführer Weiterbildung",
    "Lokführer Ausbildung",
    "Bildungsgutschein Lokführer",
    "Lokführer Quereinstieg",
    "Triebfahrzeugführer",
    "Lokführer Berlin",
    "Lokführer Saalfeld",
    "Lokführer Umschulung",
    "Agentur für Arbeit Bildungsgutschein",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: SITE_URL,
    languages: { "de-DE": SITE_URL },
  },
  category: "Education",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: SITE_NAME,
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/images/hero/hero-desktop.jpg",
        width: 1600,
        height: 900,
        alt: "Lokführer in moderner Uniform vor einem roten Regionalzug",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    images: ["/images/hero/hero-desktop.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  formatDetection: {
    email: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1530" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light",
};

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description: DESCRIPTION,
  areaServed: { "@type": "Country", name: "Deutschland" },
  address: [
    {
      "@type": "PostalAddress",
      addressLocality: "Berlin",
      addressCountry: "DE",
    },
    {
      "@type": "PostalAddress",
      addressLocality: "Saalfeld",
      addressCountry: "DE",
    },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Lokführer-Weiterbildung",
    itemListElement: [
      {
        "@type": "Course",
        name: "Lokführer-Weiterbildung",
        description:
          "15-monatige Vollzeit-Weiterbildung zum Triebfahrzeugführer (Lokführer), förderfähig über den Bildungsgutschein der Agentur für Arbeit.",
        provider: { "@type": "Organization", name: SITE_NAME },
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" dir="ltr" className={montserrat.variable}>
      <body className="font-sans antialiased">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
      </body>
    </html>
  );
}
