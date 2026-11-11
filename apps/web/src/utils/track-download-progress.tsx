import { log } from '@/utils/logger';

export async function trackDownloadProgress(
  fn: (...params: any) => Promise<Response>,
  onProgress?: (progress: number) => void
): Promise<Array<Uint8Array>> {
  const response = await fn();
  const reader = response.body?.getReader();
  const contentLength = +(response.headers?.get('Content-Length') ?? 0);

  let receivedLength = 0;
  const chunks: Array<Uint8Array> = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await reader?.read();
    if (!result || result.done) break;
    if (result.value) {
      chunks.push(result.value);
      receivedLength += result.value.length;
      log('info', `Progress: ${((receivedLength / contentLength) * 100).toFixed(2)}%`);
      if (onProgress && contentLength) {
        onProgress((receivedLength / contentLength) * 100);
      }
    }
  }
  return chunks;
}
