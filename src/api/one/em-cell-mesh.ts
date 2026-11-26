import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';

import type { TRunTaskResponse } from '@/api/one/runner';
import type { WorkspaceContext } from '@/types/common';

/** Starts the free task that converts a draft mesh's OBJ to a Draco GLB, then activates the mesh. */
export async function convertEMCellMesh({
  ctx,
  entityId,
}: {
  ctx: WorkspaceContext;
  entityId: string;
}): Promise<TRunTaskResponse> {
  const api = await obioneApi();
  return await api.post<TRunTaskResponse>(`/declared/em-cell-mesh/${entityId}/convert`, {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/json',
    },
  });
}
