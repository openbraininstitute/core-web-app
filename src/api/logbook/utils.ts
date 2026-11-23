import { authApiClient } from '@/api/api-client';
import { config } from '@/config';

export async function logbookApi() {
  const baseUrl = config.LOGBOOK_URL;
  if (!baseUrl) throw new Error('LOGBOOK_URL not configured');
  return authApiClient(`${baseUrl}/v1`);
}

export function collaborationUrl(pageId: string): string {
  const url = new URL(
    `${config.LOGBOOK_URL}/v1/collaboration/${encodeURIComponent(pageId)}`,
    `${location.protocol}//${location.host}`
  );
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}
