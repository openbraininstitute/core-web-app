import { toExpandQueryParam } from '@/api/entitycore/types/shared/expand';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  ICellComposition,
  ICellCompositionFilter,
} from '@/api/entitycore/types/entities/cell-composition';
import type { EntityExpandParam } from '@/api/entitycore/types/shared/expand';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
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
export async function getCellComposition({
  ctx,
  id,
  expand,
}: {
  ctx?: WorkspaceContext;
  id: string;
  /** entitycore `expand` values, sent as repeated `expand=` params. */
  expand?: ReadonlyArray<EntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<ICellComposition>(`${baseUri}/${id}`, {
    ...getEntityCoreContext(ctx),
    queryParams: { expand: toExpandQueryParam(expand) },
  });
}

export async function getCellCompositions({
  ctx,
  filters,
  expand,
}: {
  ctx?: WorkspaceContext;
  filters: Partial<ICellCompositionFilter>;
  /** entitycore `expand` values, sent as repeated `expand=` params. */
  expand?: ReadonlyArray<EntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ICellComposition>>(baseUri, {
    ...getEntityCoreContext(ctx),
    queryParams: { ...filters, expand: toExpandQueryParam(expand) },
  });
}
