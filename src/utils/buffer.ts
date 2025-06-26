export function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8');
  const jsonString = decoder.decode(buffer);
  return jsonString;
}

export function arrayBufferToJson<T>(buffer: ArrayBuffer): T {
  const data = arrayBufferToString(buffer);
  return JSON.parse(data);
}
