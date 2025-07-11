import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';

import type { WorkspaceContext } from '@/types/common';

export async function runValidation({
  ctx,
  modelId,
  signal,
}: {
  ctx: WorkspaceContext;
  modelId: string;
  signal?: AbortSignal;
}) {
  const api = await smallScaleSimulatorApi();

  return await api.post<Response>(
    '/single-neuron/validation/run',
    {
      queryParams: {
        model_id: modelId,
      },
      headers: {
        ...getEntityCoreContext(ctx).headers,
        'Content-Type': 'application/json',
        accept: 'application/octet-stream',
      },
      signal,
    },
    { asRawResponse: true }
  );
}
