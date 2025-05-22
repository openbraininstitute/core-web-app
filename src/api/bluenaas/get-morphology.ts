import { getEntityCoreContext } from '@/api/entitycore/utils';
import { bluenaasApi } from '@/api/bluenaas/utils';

import type { WorkspaceContext } from '@/types/common';

type Params = {
  ctx: WorkspaceContext;
  meModelId: string;
  signal?: AbortSignal;
};

export default async function getMorphology({ ctx, meModelId, signal }: Params) {
  const api = await bluenaasApi();
  return await api.get<Response>(
    '/entitycore/morphology',
    {
      queryParams: { model_id: meModelId },
      headers: {
        ...getEntityCoreContext(ctx).headers,
        accept: 'application/x-ndjson',
        'Content-Type': 'application/json',
      },
      signal,
    },
    { asRawResponse: true }
  );
}
