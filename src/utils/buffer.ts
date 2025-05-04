export function arrayBufferToJson(buffer: ArrayBuffer): any {
  const decoder = new TextDecoder('utf-8');
  const jsonString = decoder.decode(buffer);
  return JSON.parse(jsonString);
}
