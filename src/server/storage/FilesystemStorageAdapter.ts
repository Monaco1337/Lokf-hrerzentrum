/**
 * Filesystem storage adapter.
 *
 * Persists payloads to disk under `STORAGE_DIR`. Keys are opaque to callers –
 * we hash the lead/file id pair into a sharded path on disk so that:
 *   - listings are not enumerable from the URL
 *   - one bad key cannot escape `STORAGE_DIR` (path traversal is rejected)
 *   - the on-disk layout stays balanced even with many files
 *
 * The same interface (`StorageAdapter`) is honoured, so swapping to S3/MinIO
 * later only touches the adapter wiring, not the calling services.
 */
import { promises as fs, type Stats } from "node:fs";
import path from "node:path";

import { env } from "@/server/env";

import type { StorageAdapter } from "./StorageAdapter";

const KEY_REGEX = /^[a-z0-9][a-z0-9_/.-]{0,200}$/i;

function resolveSafe(baseDir: string, key: string): string {
  if (!KEY_REGEX.test(key)) {
    throw new Error("Invalid storage key");
  }
  const abs = path.resolve(baseDir, key);
  const baseResolved = path.resolve(baseDir);
  if (!abs.startsWith(baseResolved + path.sep) && abs !== baseResolved) {
    throw new Error("Path traversal rejected");
  }
  return abs;
}

class FilesystemStorageAdapter implements StorageAdapter {
  constructor(private readonly baseDir: string) {}

  private async ensureBaseDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  async put(key: string, payload: Buffer): Promise<string> {
    await this.ensureBaseDir();
    const abs = resolveSafe(this.baseDir, key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, payload, { mode: 0o640 });
    return key;
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const abs = resolveSafe(this.baseDir, key);
      const buf = await fs.readFile(abs);
      return buf;
    } catch (err) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return null;
      }
      throw err;
    }
  }

  async stat(key: string): Promise<Stats | null> {
    try {
      const abs = resolveSafe(this.baseDir, key);
      return await fs.stat(abs);
    } catch (err) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return null;
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const abs = resolveSafe(this.baseDir, key);
      await fs.unlink(abs);
    } catch (err) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return;
      }
      throw err;
    }
  }

  get root(): string {
    return this.baseDir;
  }
}

/**
 * Build a content-addressable storage key from a sha256.
 *
 * Layout: uploads/<aa>/<bb>/<full-hash>.bin
 * - first two byte-pairs as shard directories
 * - same hash twice -> same key (natural deduplication)
 */
export function buildContentKey(sha256Hex: string, prefix = "uploads"): string {
  if (!/^[a-f0-9]{64}$/i.test(sha256Hex)) {
    throw new Error("Invalid sha256");
  }
  const lower = sha256Hex.toLowerCase();
  return `${prefix}/${lower.slice(0, 2)}/${lower.slice(2, 4)}/${lower}.bin`;
}

export const filesystemStorageAdapter = new FilesystemStorageAdapter(
  env.STORAGE_DIR,
);
