import { authApiClient } from '@/api/api-client';
import { config } from '@/config';

export const JSON_BODY = { 'content-type': 'application/json' };

function logbookBaseUrl(): string {
  const baseUrl = config.LOGBOOK_URL;
  if (!baseUrl) throw new Error('LOGBOOK_URL not configured');
  return baseUrl;
}

export async function logbookApi() {
  return authApiClient(`${logbookBaseUrl()}/v1`);
}

export function collaborationUrl(pageId: string): string {
  const url = new URL(
    `${logbookBaseUrl()}/v1/collaboration/${encodeURIComponent(pageId)}`,
    `${location.protocol}//${location.host}`
  );
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}
