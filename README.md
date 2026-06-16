# Fairtrain Lead Funnel

Produktionsnahe Leadfalle für die staatlich geförderte 15-monatige Lokführer-Weiterbildung (Fairtrain) mit Eignungs-Wizard, Lead-Scoring, CRM, Statusmaschine, Magic-Link/WhatsApp-Adapter und Dokumenten-Pipeline.

## Stack

- **Next.js 15** (App Router) + **TypeScript** strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Prisma** ORM mit **SQLite** lokal, Postgres-bereit ohne Domain-Rewrite
- **Tailwind CSS**
- **react-hook-form** + **zod** für Validierung
- **bcryptjs** + **jose** (HS256) für das CRM-Auth-Gate
- **Vitest** für Tests

## Architektur

Schichten strikt getrennt (per ESLint `no-restricted-imports` durchgesetzt):

```
UI Components ─► Server Actions / API Routes ─► Services ─► Repositories ─► Prisma ─► DB
```

Regeln:

- React-Komponenten dürfen **nur** `@/server/actions/*` aus dem Server-Bereich importieren – nie Services, Repositories oder Prisma.
- Services importieren **nie** `@prisma/client` direkt – nur über Repositories. Den `TransactionClient`-Typ exportiert `src/server/db/prisma.ts` für Service-zu-Repo-Transaktionen.
- Pure Logik (Scoring, Statusmaschine, Eligibility-Config, SLA-Berechnung, Salary-Copy) lebt unter `src/features/fairtrain-funnel/**` und ist von UI und Server frei nutzbar.

### Append-only Tabellen

`StatusHistory`, `CommunicationEvent`, `ConsentRecord`, `AuditLog` – die Repositories exponieren ausschließlich `append()` und `list()`. Status-Override-Audits, sensible Datenzugriffe, Login-Versuche und Consent-Widerrufe entstehen als neue, unveränderliche Records.

### Sensible Daten

`SensitiveAnswers` (MPU/Drogen) liegen in einer separaten Tabelle und werden **niemals** in Listen-Queries gejoint. Jedes Anzeigen über die CRM-UI ruft `revealSensitive`, das einen `AuditLog`-Eintrag (`SENSITIVE_REVEAL`) schreibt.

### Magic-Link-Tokens

- 32 Byte Zufall, base64url, an Aufrufer **einmal** zurückgegeben.
- Persistiert wird ausschließlich `sha256(token + TOKEN_PEPPER)`.
- Single-use über `usedAt`, Ablauf über `expiresAt`.
- URLs (`/m/<token>`) enthalten keinerlei PII und keine Lead-ID.

### SLA

HOT-Leads müssen innerhalb 30 Minuten kontaktiert werden. `SlaService.sweep()` setzt `slaBreachedAt` persistent. Aufruf via `POST /api/cron/sla-sweep` mit Header `X-Cron-Secret`.

## Schnellstart

```bash
npm install
cp .env.example .env       # bereits angelegt mit Dev-Defaults
npx prisma migrate dev     # erzeugt prisma/dev.db
npm run dev
```

Dann:

- Landing: <http://localhost:3000>
- Wizard: <http://localhost:3000/eligibility>
- CRM: <http://localhost:3000/crm/login> (Dev-Passwort: `dev`)

## Tests

```bash
npm test
```

Aktuell 28 Tests in 4 Suites:

- `tests/scoring.test.ts` – Punkte, Blocking, Vollständigkeit, Schwellenwerte
- `tests/statusMachine.test.ts` – Übergangsmatrix, Endzustände, Happy-Path
- `tests/magicLinkTokenService.test.ts` – Hash-only Storage, Single-Use, Expiry (Integration mit Test-SQLite)
- `tests/documentReadiness.test.ts` – Determinismus, Conditional (Saalfeld), Master-Bundle-Aggregation

## ENV-Variablen

Pflicht in Production (`NODE_ENV=production`):

| Variable | Zweck |
| --- | --- |
| `DATABASE_URL` | Datenbank-URI (SQLite `file:./dev.db` oder Postgres-URL) |
| `CRM_PASSWORD_HASH` | bcrypt-Hash (cost ≥ 12) des CRM-Passworts |
| `CRM_SESSION_SECRET` | 32+ Byte für die HMAC-Signatur des Session-Cookies |
| `IP_SALT` | Salt für IP-Hashing in `ConsentRecord` |
| `TOKEN_PEPPER` | Pepper für Magic-Link-Token-Hashing |
| `APP_BASE_URL` | absolute App-URL für Magic-Link-Generierung |

Optional / Provider:

| Variable | Zweck |
| --- | --- |
| `COMMUNICATION_PROVIDER` | `mock` (Default) \| `meta` \| `twilio` \| `dialog360` |
| `META_WABA_TOKEN`, `META_PHONE_NUMBER_ID` | Meta Cloud API |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio |
| `DIALOG360_API_KEY` | 360Dialog |
| `MAGIC_LINK_TTL_MINUTES` | Default 60 |
| `CRON_SECRET` | Header-Secret für `/api/cron/sla-sweep` |

### bcrypt-Hash & Secrets erzeugen

```bash
node -e "console.log(require('bcryptjs').hashSync('dein-passwort', 12))"
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

## Migration SQLite → PostgreSQL

1. `.env`: `DATABASE_URL="postgresql://user:pass@host:5432/dbname"`.
2. `prisma/schema.prisma`: `provider = "postgresql"`.
3. `npx prisma migrate deploy` gegen die leere Postgres-DB.
4. Optionaler Datenexport via Skript (`scripts/migrate-sqlite-to-postgres.ts`, noch nicht erstellt; einfacher Prisma-Loop, Tabellen in Insert-Reihenfolge: `Lead → SensitiveAnswers → EligibilityAnswer → StatusHistory → Note → Document → CommunicationEvent → MagicLinkToken → ConsentRecord → AuditLog`).
5. App-Deploy auf Vercel / VPS / NAS – URLs sind alle relativ aus `APP_BASE_URL`, kein Rewrite.

Bewusste Maßnahmen für Portabilität:

- Alle IDs sind `cuid()` (kein Auto-Increment-Integer).
- Keine SQLite-spezifischen Defaults oder Raw-SQL.
- Keine JSON-/Bytes-Spalten für queryable kritische Daten (`payload` in `CommunicationEvent` ist eine bewusste, nicht-queryable Provider-Audit-Spur).
- Enum-Werte als String in der DB, mit zod-Validierung an jeder Anwendungsgrenze (TypeScript-Enums in `src/features/fairtrain-funnel/types.ts` sind die einzige Quelle der Wahrheit).
- Append-only-Tabellen erlauben keine destruktiven Operationen.

## Offene Integrationspunkte

| Bereich | Heute | Später |
| --- | --- | --- |
| WhatsApp / E-Mail / SMS | `MockProvider` loggt nur | Meta Cloud API / 360Dialog / Twilio konkrete Implementierung |
| PDF-Engine | Markdown-Vorschau | pdfkit oder Headless-Chromium in `DocumentService.generate()` |
| Object Storage | In-Memory `LocalStorageAdapter` | S3 / MinIO über gleiches `StorageAdapter`-Interface |
| Auth | Password-Gate mit signiertem Cookie | NextAuth / Clerk (Cookie-Vertrag bleibt) |
| SLA-Cron | `/api/cron/sla-sweep` (Stub-Endpoint vorhanden) | Vercel Cron oder VPS-Crontab |
| WhatsApp-Webhook | `/api/webhooks/whatsapp` (Stub) | Signatur-Verifikation + `CommunicationEvent` (`direction=IN`) |
| DSGVO-Export/Löschung | Service-Hooks vorbereitet | UI-Flow im CRM |
| Audit-Log-Sichtbarkeit | Tabelle aktiv und gefüllt | CRM-UI für Audit-Browser |

## Dateibaum (Auszug)

```
prisma/
  schema.prisma
  migrations/

src/
  app/                              # Next.js App Router
    page.tsx                        # Landingpage
    eligibility/page.tsx            # Wizard
    m/[token]/page.tsx              # Magic-Link Consume
    crm/
      layout.tsx                    # CRM-Shell
      login/page.tsx
      page.tsx                      # Dashboard
      leads/page.tsx                # Lead-Liste
      leads/[id]/page.tsx           # Lead-Detail
    api/
      cron/sla-sweep/route.ts
      consent/revoke/route.ts
      webhooks/whatsapp/route.ts

  middleware.ts                     # /crm/* Schutz

  features/fairtrain-funnel/
    types.ts                        # Domain types + zod-Enums (SoT)
    copy/salary.ts                  # Gehalts-Wording (einzige 5.600€-Quelle)
    scoring/scoring.ts              # pure
    scoring/eligibilityQuestions.ts # konfigurierbare Pflichtfragen
    statusMachine.ts                # Übergangsmatrix
    utils/sla.ts                    # pure SLA-Auswertung
    forms/schemas.ts                # zod-Schemas (Wizard + Actions)
    documents/documentTypes.ts      # Templates
    documents/readiness.ts          # pure readiness
    communication/                  # Provider-Adapter
    components/                     # Landingpage, Wizard
    crm/                            # Dashboard, Lead-Liste, Lead-Detail-Bausteine

  server/
    db/prisma.ts                    # einziger Prisma-Client + TransactionClient
    env.ts                          # zod-validierte ENV
    errors.ts                       # DomainError-Hierarchie
    repositories/                   # einziger @prisma/client-Importbereich
    services/                       # Geschäftslogik, transaktional
    storage/                        # StorageAdapter
    actions/                        # "use server" Aktionen

tests/                              # Vitest
```

## Akzeptanzkriterien-Status

| Kriterium | Status |
| --- | --- |
| Landingpage vorhanden | ✓ `FairtrainLandingPage.tsx` |
| Mehrstufiger Eignungscheck | ✓ 6 Steps mit zod-Validierung |
| Lead-Scoring | ✓ `ScoringService` + Tests |
| Dual Funnel | ✓ `funnelPath` + Step 2 |
| Standort Berlin/Saalfeld | ✓ + Saalfeld-Housing-Section |
| Consent sauber gespeichert | ✓ Append-only `ConsentRecord` |
| Lead im CRM sichtbar | ✓ Dashboard + Liste + Detail |
| Lead-Status änderbar | ✓ `StatusChanger` mit Übergangsvalidierung |
| HOT priorisiert | ✓ Sortierung + `SlaService` + `SLA_BREACHED`-Badge |
| Dokumentenstruktur | ✓ `DocumentService` + Templates + Master-Bundle |
| Master-PDF modelliert | ✓ `DocumentType.MASTER_BUNDLE` + Aggregator |
| Magic-Link/WhatsApp vorbereitet | ✓ Hash-only, MockProvider + Stubs |
| Keine echten Tokens im Frontend | ✓ Keine `NEXT_PUBLIC_*` für sensible Werte |
| Sensible Daten geschützt | ✓ Separate Tabelle + AuditLog |
| Modular und erweiterbar | ✓ Schichten + ESLint-Regeln |

## Nicht umgesetzt (per Vorgabe)

- Keine echte Meta-API hart verdrahtet.
- Keine Signaturpflicht.
- Keine externe Dokumenten-API.
- Keine Gehalts-Garantien (Wording wird zentral aus `copy/salary.ts` bezogen, Disclaimer auf Landingpage).
- Keine eigenständige Fairtrain-Website.
- Kein Lead-Storage in LocalStorage / JSON-Files.
