/**
 * Storage adapter interface.
 *
 * The MVP ships with a no-op local adapter; production swaps in an S3/MinIO
 * implementation. The interface uses opaque `storageKey` strings so callers
 * never know about filesystem paths.
 */
export interface StorageAdapter {
  /** Persist a payload under the given key and return that key. */
  put(key: string, payload: Buffer): Promise<string>;

  /** Read a payload by key. Returns null if not found. */
  get(key: string): Promise<Buffer | null>;
}
