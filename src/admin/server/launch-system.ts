import 'server-only';

import { auth } from '@/auth';
import { serverConfig } from '@/config/server';
import { isUuid } from '@/features/data-grid/react/filters/id-tokens';

import type { JobLookup } from '../sections/launch-system/job';

const LOOKUP_TIMEOUT_MS = 15_000;

export async function fetchAdminJob(
  baseUrl: string,
  jobId: string,
  accessToken: string
): Promise<JobLookup> {
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/admin/job/${encodeURIComponent(jobId)}`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
    cache: 'no-store',
    // The gateway answers a refused source with a redirect to the main site, which must not get
    // the token.
    redirect: 'manual',
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  }).catch(() => null);
  if (!res) return { outcome: 'not-reachable' };

  // Launch-system always answers JSON, so another body came from the gateway or the web app.
  const isJson = res.headers.get('content-type')?.includes('json');
  if (!isJson || (res.status >= 300 && res.status < 400)) {
    return { outcome: 'not-reachable', status: res.status };
  }

  const body = await res.json().catch(() => null);
  if (res.ok) return { outcome: 'found', job: body };
  if (res.status === 404) return { outcome: 'not-found' };
  if (res.status === 401 || res.status === 403) return { outcome: 'denied' };
  return {
    outcome: 'failed',
    status: res.status,
    message: typeof body?.message === 'string' ? body.message : null,
  };
}

export async function lookupJob(jobId: string): Promise<JobLookup> {
  if (!isUuid(jobId)) return { outcome: 'invalid-id' };
  const session = await auth();
  if (!session?.accessToken) return { outcome: 'denied' };
  return fetchAdminJob(serverConfig.LAUNCH_SYSTEM_URL, jobId, session.accessToken);
}
