const HASH_CHUNK_SIZE = 4 * 1024 * 1024;

/**
 * Computes the SHA-256 digest (lowercase hex) of a Blob/File by reading it chunk by chunk,
 * so memory usage stays constant regardless of file size.
 *
 * @param blob - The blob to hash
 * @param options.signal - Aborts the read loop between chunks
 * @param options.onProgress - Called with the number of bytes hashed so far
 */
export async function sha256HexOfBlob(
  blob: Blob,
  {
    signal,
    onProgress,
  }: {
    signal?: AbortSignal;
    onProgress?: (hashedBytes: number) => void;
  } = {}
): Promise<string> {
  // Dynamic import so hash-wasm stays out of the shared asset-queries chunk; it is
  // only needed for multipart-sized uploads.
  const { createSHA256 } = await import('hash-wasm');
  const hasher = await createSHA256();
  hasher.init();

  for (let offset = 0; offset < blob.size; offset += HASH_CHUNK_SIZE) {
    signal?.throwIfAborted();
    const chunk = await blob.slice(offset, offset + HASH_CHUNK_SIZE).arrayBuffer();
    hasher.update(new Uint8Array(chunk));
    onProgress?.(Math.min(offset + HASH_CHUNK_SIZE, blob.size));
  }

  return hasher.digest('hex');
}
