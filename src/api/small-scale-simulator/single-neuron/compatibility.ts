import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';

import type { WorkspaceContext } from '@/types/common';
import type { ApiResponse } from '@/types/small-scale-simulator/common';

/**
 * `check_failed` means the check itself could not run — a download, compilation or
 * timeout failure — which says nothing about whether the two models go together.
 */
export type CompatibilityStatus = 'compatible' | 'incompatible' | 'check_failed';

export type CompatibilityCheckResponse = {
  /** Optional: absent on responses from a simulator predating the three-state result. */
  status?: CompatibilityStatus;
  compatible: boolean;
  morphology_id: string;
  emodel_id: string;
  /** One-line reason, in NEURON's own wording where it has one. */
  error?: string | null;
  /** The fuller NEURON output behind `error`, with container paths stripped. */
  details?: string | null;
};

type CheckCompatibilityParams = {
  ctx: WorkspaceContext;
  morphologyId: string;
  emodelId: string;
  signal?: AbortSignal;
};

export async function checkCompatibility({
  ctx,
  morphologyId,
  emodelId,
  signal,
}: CheckCompatibilityParams) {
  const api = await smallScaleSimulatorApi();

  return await api.post<ApiResponse<CompatibilityCheckResponse>>(
    '/single-neuron/compatibility/run',
    {
      headers: {
        ...getEntityCoreContext(ctx).headers,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: {
        morphology_id: morphologyId,
        emodel_id: emodelId,
      },
      signal,
    }
  );
}
