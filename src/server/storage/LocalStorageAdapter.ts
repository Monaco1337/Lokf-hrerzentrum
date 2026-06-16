/**
 * Dev-only in-memory storage adapter.
 *
 * Returns the provided key without writing to disk. Production swaps in an
 * S3 or MinIO adapter that obeys the same `StorageAdapter` interface. No
 * caller should rely on persistence here.
 */
import type { StorageAdapter } from "./StorageAdapter";

class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, Buffer>();

  async put(key: string, payload: Buffer): Promise<string> {
    this.store.set(key, payload);
    return key;
  }

  async get(key: string): Promise<Buffer | null> {
    return this.store.get(key) ?? null;
  }
}

export const localStorageAdapter: StorageAdapter = new InMemoryStorageAdapter();
