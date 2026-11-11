import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';

import type { WorkspaceContext } from '@/types/common';

export const MorphologyPackNoPackReason = {
  SingleNeuron: 'single_neuron',
  TooLarge: 'too_large',
  NoMorphologies: 'no_morphologies',
} as const;

export type TMorphologyPackNoPackReason =
  (typeof MorphologyPackNoPackReason)[keyof typeof MorphologyPackNoPackReason];

export const MorphologyPackState = {
  Ready: 'ready',
  Building: 'building',
  Refused: 'refused',
  Failed: 'failed',
} as const;

/** Where Bluenaas has the circuit's morphology pack, which it builds the first time it is asked. */
export type MorphologyPackStatus =
  | { state: typeof MorphologyPackState.Ready; size: number; sha256: string }
  | { state: typeof MorphologyPackState.Building; queue_position?: number | null }
  | { state: typeof MorphologyPackState.Refused; reason: TMorphologyPackNoPackReason }
  | { state: typeof MorphologyPackState.Failed };

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
