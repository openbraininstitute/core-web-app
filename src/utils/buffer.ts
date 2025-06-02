export function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8');
  const jsonString = decoder.decode(buffer);
  return jsonString;
}

export function arrayBufferToJson(buffer: ArrayBuffer): Record<string, any> {
  const data = arrayBufferToString(buffer);
  return JSON.parse(data);
}
