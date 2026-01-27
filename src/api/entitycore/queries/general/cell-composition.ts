import type {
  ICellComposition,
  ICellCompositionFilter,
} from '@/api/entitycore/types/entities/cell-composition';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/cell-composition';

/**
 * Retrieves the cell composition data from the Entity Core API.
 *
 * @param ctx - The workspace context containing authentication and environment information.
 * @returns A promise that resolves to the cell composition root object.
 *
 * @remarks
 * The result is cached with a cache name of 'cell-composition' for 24 hours (86,400 seconds).
 */
export async function getCellComposition({ ctx, id }: { ctx?: WorkspaceContext; id: string }) {
  const api = await entityCoreApi();
  return await api.get<ICellComposition>(`${baseUri}/${id}`, { ...getEntityCoreContext(ctx) });
}

export async function getCellCompositions({
  ctx,
  filters,
}: {
  ctx?: WorkspaceContext;
  filters: Partial<ICellCompositionFilter>;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ICellComposition>>(baseUri, {
    ...getEntityCoreContext(ctx),
    queryParams: { ...filters },
  });
}
