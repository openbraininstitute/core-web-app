import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';

import type { WorkspaceContext } from '@/types/common';

export type MorphologyPackNoPackReason = 'single_neuron' | 'too_large' | 'no_morphologies';

/** Where Bluenaas has the circuit's morphology pack, which it builds the first time it is asked. */
export type MorphologyPackStatus =
  | { state: 'ready'; size: number; sha256: string }
  | { state: 'building'; queue_position?: number | null }
  | { state: 'refused'; reason: MorphologyPackNoPackReason }
  | { state: 'failed' };

const packPath = (circuitId: string) => `/circuit/${encodeURIComponent(circuitId)}/morphology-pack`;

/** The pack's status, its build queued where there is neither a pack nor a build. */
export async function requestMorphologyPack({
  ctx,
  circuitId,
  signal,
}: {
  ctx: WorkspaceContext;
  circuitId: string;
  signal?: AbortSignal;
}) {
  const api = await smallScaleSimulatorApi();

  return api.post<MorphologyPackStatus>(packPath(circuitId), {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/json',
    },
    signal,
  });
}

/** The URL and headers of the pack's bytes, for a fetch of its own. */
export async function buildMorphologyPackDownloadRequest({
  ctx,
  circuitId,
}: {
  ctx: WorkspaceContext | null;
  circuitId: string;
}): Promise<{ url: string; headers: Record<string, string> }> {
  const session = await getSession();
  const headers: Record<string, string> = { ...getEntityCoreContext(ctx).headers };
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  return { url: `${config.SMALL_SCALE_SIMULATOR_URL}${packPath(circuitId)}`, headers };
}
