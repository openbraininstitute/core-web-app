import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';

import type { WorkspaceContext } from '@/types/common';

/** Where Bluenaas has an LFP report's summary, which it builds the first time it is asked. */
export type LfpSummaryStatus =
  | { state: 'ready'; size: number; sha256: string }
  | { state: 'building'; queue_position?: number | null }
  | { state: 'refused'; reason: string }
  | { state: 'failed' };

type SummaryOf = { ctx: WorkspaceContext | null; resultId: string; assetId: string };

const summaryPath = (resultId: string, assetId: string, part = '') =>
  `/simulation-result/${resultId}/lfp-summary${part}?asset=${encodeURIComponent(assetId)}`;

function contextHeaders(ctx: WorkspaceContext | null) {
  return { ...getEntityCoreContext(ctx).headers, accept: 'application/json' };
}

/** The summary's status, its build queued where there is neither a summary nor a build. */
export async function requestLfpSummary({ ctx, resultId, assetId }: SummaryOf) {
  const api = await smallScaleSimulatorApi();
  return api.post<LfpSummaryStatus>(summaryPath(resultId, assetId), {
    headers: contextHeaders(ctx),
  });
}

/** The summary's index: where each of its datasets lies in its file. */
export async function getLfpSummaryIndex({ ctx, resultId, assetId }: SummaryOf) {
  const api = await smallScaleSimulatorApi();
  return api.get<unknown>(summaryPath(resultId, assetId, '/index'), {
    headers: contextHeaders(ctx),
  });
}

/** The URL and headers of the summary's bytes, for range reads of its own. */
export async function buildLfpSummaryRequest({
  ctx,
  resultId,
  assetId,
}: SummaryOf): Promise<{ url: string; headers: Record<string, string> }> {
  const session = await getSession();
  const headers: Record<string, string> = { ...getEntityCoreContext(ctx).headers };
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  return { url: `${config.SMALL_SCALE_SIMULATOR_URL}${summaryPath(resultId, assetId)}`, headers };
}
