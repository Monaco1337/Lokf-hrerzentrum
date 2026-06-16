/**
 * Environment validation. Runs at boot via Next.js module evaluation when
 * any server module imports `serverEnv`.
 *
 * Fails fast in production if required secrets are missing.
 * In development, missing values fall back to safe placeholders with a warning.
 */
import { z } from "zod";

const RawEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),

  CRM_PASSWORD_HASH: z.string().default(""),
  CRM_SESSION_SECRET: z.string().default(""),

  IP_SALT: z.string().default(""),
  TOKEN_PEPPER: z.string().default(""),

  MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().positive().default(60),

  COMMUNICATION_PROVIDER: z
    .enum(["mock", "meta", "twilio", "dialog360"])
    .default("mock"),

  // Automation-specific providers (decoupled from Magic-Link CommunicationService)
  EMAIL_PROVIDER: z.enum(["disabled", "mock", "resend", "smtp"]).default("mock"),
  WHATSAPP_PROVIDER: z
    .enum(["disabled", "mock", "meta", "twilio"])
    .default("mock"),
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default(""),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  TWILIO_WHATSAPP_FROM: z.string().default(""),

  META_WABA_TOKEN: z.string().default(""),
  META_PHONE_NUMBER_ID: z.string().default(""),
  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  DIALOG360_API_KEY: z.string().default(""),

  CRON_SECRET: z.string().default(""),

  // File storage (uploaded CV / certificates / etc.)
  STORAGE_DIR: z.string().min(1).default("./storage"),
  STORAGE_DOWNLOAD_SIGNING_SECRET: z.string().default(""),
});

export type ServerEnv = z.infer<typeof RawEnvSchema>;

function loadEnv(): ServerEnv {
  const parsed = RawEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast - server cannot boot with invalid environment.
    throw new Error(
      `Invalid environment configuration:\n${parsed.error.toString()}`,
    );
  }
  const env = parsed.data;

  const productionRequired: Array<keyof ServerEnv> = [
    "CRM_PASSWORD_HASH",
    "CRM_SESSION_SECRET",
    "IP_SALT",
    "TOKEN_PEPPER",
  ];

  if (env.NODE_ENV === "production") {
    const missing = productionRequired.filter((key) => !env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required production env vars: ${missing.join(", ")}`,
      );
    }
  } else {
    // Dev: warn but allow fallback for ergonomics.
    for (const key of productionRequired) {
      if (!env[key]) {
        // eslint-disable-next-line no-console
        console.warn(
          `[env] ${key} is empty - using dev fallback. Set it before deploying.`,
        );
      }
    }
  }

  return env;
}

export const serverEnv: ServerEnv = loadEnv();

/**
 * Per-secret accessors with dev fallbacks. Production already validated above.
 * These are the only call sites that may consume the secret-ish values.
 */
export function getSessionSecret(): string {
  return (
    serverEnv.CRM_SESSION_SECRET ||
    "dev-insecure-session-secret-do-not-use-in-prod-please-change-me"
  );
}

export function getIpSalt(): string {
  return serverEnv.IP_SALT || "dev-insecure-ip-salt-change-me";
}

export function getTokenPepper(): string {
  return serverEnv.TOKEN_PEPPER || "dev-insecure-token-pepper-change-me";
}

export function getCrmPasswordHash(): string {
  return serverEnv.CRM_PASSWORD_HASH;
}

export function getStorageDownloadSigningSecret(): string {
  return (
    serverEnv.STORAGE_DOWNLOAD_SIGNING_SECRET ||
    "dev-insecure-download-signing-secret-change-me"
  );
}

/**
 * Resolved absolute storage directory. Created lazily by the adapter on first
 * write; callers may import `env.STORAGE_DIR` to display the path or build
 * test fixtures.
 */
export const env = {
  STORAGE_DIR: serverEnv.STORAGE_DIR,
} as const;
