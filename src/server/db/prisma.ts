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

function makeClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
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
