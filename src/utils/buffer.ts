export function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8');
  const jsonString = decoder.decode(buffer);
  return jsonString;
}

/**
 * Frees `buffer`'s bytes at once, where the browser can, rather than when the collector comes by. Nothing may read it
 * after.
 */
export function detach(buffer: ArrayBufferLike): void {
  if (buffer instanceof ArrayBuffer && !buffer.detached) buffer.transfer?.(0);
}
