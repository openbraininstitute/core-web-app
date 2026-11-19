import { authApiClient } from '@/api/api-client';
import { config } from '@/config';

/** The logbook server's versioned API, as the signed-in person. */
export async function logbookApi() {
  const baseUrl = config.LOGBOOK_URL;
  if (!baseUrl) throw new Error('LOGBOOK_URL not configured');
  return authApiClient(`${baseUrl}/v1`);
}

/**
 * The collaboration WebSocket of one page. The page id in the path lets the router in front of the
 * server send every person of a page to the same task (page affinity).
 */
export function collaborationUrl(pageId: string): string {
  const url = new URL(
    `${config.LOGBOOK_URL}/v1/collaboration/${encodeURIComponent(pageId)}`,
    `${location.protocol}//${location.host}`
  );
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}
