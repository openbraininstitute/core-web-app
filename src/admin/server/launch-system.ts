import { getAuthSession } from '@/features/auth/session';
import 'server-only';

import { serverConfig } from '@/config/server';
import { isUuid } from '@/features/data-grid/react/filters/id-tokens';

import { JobOutcome } from '../sections/launch-system/job';
import { isGatewayReply } from './service-probe';

import type { TJobLookup } from '../sections/launch-system/job';

const LOOKUP_TIMEOUT_MS = 15_000;

export async function fetchAdminJob(
  baseUrl: string,
  jobId: string,
  accessToken: string
): Promise<TJobLookup> {
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/admin/job/${encodeURIComponent(jobId)}`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  }).catch(() => null);
  if (!res) return { outcome: JobOutcome.NoAnswer };

  if (isGatewayReply(res)) return { outcome: JobOutcome.NotReachable, status: res.status };

  const body = await res.json().catch(() => null);
  if (res.ok) return { outcome: JobOutcome.Found, job: body };
  if (res.status === 404) return { outcome: JobOutcome.NotFound };
  if (res.status === 401 || res.status === 403) {
    if (!body?.error_code) return { outcome: JobOutcome.NotReachable, status: res.status };
    return { outcome: JobOutcome.Denied };
  }
  return {
    outcome: JobOutcome.Failed,
    status: res.status,
    message: typeof body?.message === 'string' ? body.message : null,
  };
}

export async function lookupJob(jobId: string): Promise<TJobLookup> {
  if (!isUuid(jobId)) return { outcome: JobOutcome.InvalidId };
  const session = await getAuthSession();
  if (!session?.accessToken) return { outcome: JobOutcome.Denied };
  return fetchAdminJob(serverConfig.LAUNCH_SYSTEM_URL, jobId, session.accessToken);
}
