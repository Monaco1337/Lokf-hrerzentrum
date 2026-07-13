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
 * These happen on serverless cold starts / pool churn and otherwise bubble up
 * as an uncaught server exception (white screen).
 */
const RETRYABLE_CONNECTION_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
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

function makeClient(): PrismaClient {
  const base = new PrismaClient({
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
