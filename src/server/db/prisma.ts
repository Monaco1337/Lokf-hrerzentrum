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

export const prisma: PrismaClient = global.__prismaClient ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  global.__prismaClient = prisma;
}
