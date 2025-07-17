export function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8');
  const jsonString = decoder.decode(buffer);
  return jsonString;
}
