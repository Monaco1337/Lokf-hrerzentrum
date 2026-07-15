/**
 * Single Prisma client instance.
 *
 * This is the ONLY place in the codebase that imports `@prisma/client`
 * outside of repositories. Services and UI must never import this directly;
 * they go through Repository classes.
 */
import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Re-export the transaction client type so service-layer files can pass
 * transactions around WITHOUT importing `@prisma/client` directly.
 */
export type TransactionClient = Prisma.TransactionClient;

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

/**
 * Connection-level error codes where the query provably NEVER reached the DB,
 * so retrying is safe (no risk of a duplicated write):
 *   P1001 – can't reach database server
 *   P1002 – server reached but timed out
 *   P1008 – operation timed out
 *   P1017 – server closed the connection
 *   P2024 – timed out fetching a connection from the pool
 *   P2037 – too many database connections opened (server-side role cap hit)
 * These happen on serverless cold starts / pool churn / connection saturation
 * and otherwise bubble up as an uncaught server exception (white screen).
 */
const RETRYABLE_CONNECTION_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
  "P2037",
]);

function isRetryableConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    RETRYABLE_CONNECTION_CODES.has(err.code)
  ) {
    return true;
  }
  return false;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function withConnectionRetry<T>(run: () => Promise<T>): Promise<T> {
  const delays = [120, 350, 800];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await run();
    } catch (err) {
      if (!isRetryableConnectionError(err) || attempt === delays.length) {
        throw err;
      }
      lastErr = err;
      await sleep(delays[attempt]!);
    }
  }
  throw lastErr;
}

/**
 * Cap the client-side connection pool WELL below the database role's hard cap.
 *
 * The default Prisma pool size is `num_cpus * 2 + 1` (e.g. 17 on an 8-core
 * box). Firing the dashboard's ~13 parallel queries then tried to open 17
 * connections at once, but the `db.prisma.io` role rejects that many
 * (`P2037: too many connections`), which 500'd the whole CRM. A small, fixed
 * pool makes parallel queries QUEUE inside the client instead of stampeding
 * the server — each request still runs, just a few at a time. `pool_timeout`
 * is widened so a brief queue never surfaces as `P2024`.
 *
 * Overridable per-environment via DB_CONNECTION_LIMIT / DB_POOL_TIMEOUT.
 */
function buildDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set(
        "connection_limit",
        process.env.DB_CONNECTION_LIMIT ?? "5",
      );
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", process.env.DB_POOL_TIMEOUT ?? "20");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function makeClient(): PrismaClient {
  const datasourceUrl = buildDatasourceUrl();
  const base = new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  // Retry ONLY transient connection failures (never query errors). Keeps a
  // Prisma Postgres cold start / pool blip from white-screening the whole app.
  const extended = base.$extends({
    query: {
      async $allOperations({ args, query }) {
        return withConnectionRetry(() => query(args));
      },
    },
  });
  return extended as unknown as PrismaClient;
}

let client: PrismaClient | undefined;

/**
 * Lazily construct the client on first real access. This is crucial for the
 * build: Next.js imports every route module during "Collecting page data",
 * and constructing PrismaClient at module load would try to resolve the query
 * engine at build time (which fails on platforms where the engine for the
 * build host isn't present). Deferring construction keeps imports side-effect
 * free, so the client (and its engine) is only needed at request time.
 */
function getClient(): PrismaClient {
  if (client) return client;
  client = global.__prismaClient ?? makeClient();
  if (process.env.NODE_ENV !== "production") {
    global.__prismaClient = client;
  }
  return client;
}

/**
 * Proxy that forwards every access to the lazily-created client. Top-level
 * client methods ($transaction, $queryRaw, …) are bound; model delegates
 * (prisma.lead, …) are returned as-is since Prisma binds their methods.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const instance = getClient();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});
