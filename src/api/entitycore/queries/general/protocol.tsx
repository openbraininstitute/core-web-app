import { toExpandQueryParam } from '@/api/entitycore/types/shared/expand';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { EntityExpandParam } from '@/api/entitycore/types/shared/expand';
import type { IProtocol } from '@/api/entitycore/types/shared/global';
import type { IProtocolFilter } from '@/api/entitycore/types/shared/protocol';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/cell-morphology-protocol';

/**
 * Retrieves protocols from the Entity Core API.
 *
 * @param filters - Optional filters to apply to the protocol query.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the protocols.
 */
export async function getProtocols({
  filters,
  context,
  expand,
}: {
  filters?: Partial<IProtocolFilter>;
  context?: WorkspaceContext | null;
  /** entitycore `expand` values, sent as repeated `expand=` params. */
  expand?: ReadonlyArray<EntityExpandParam>;
}): Promise<EntityCoreResponse<IProtocol>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IProtocol>>(baseUri, {
    queryParams: compactRecord({
      expand: toExpandQueryParam(expand),
      ...filters,
    }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a protocol from the Entity Core API.
 *
 * @param id - The ID of the protocol to retrieve.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the protocol.
 */
export async function getProtocol({
  id,
  context,
  expand,
}: {
  id: string;
  context?: WorkspaceContext | null;
  /** entitycore `expand` values, sent as repeated `expand=` params. */
  expand?: ReadonlyArray<EntityExpandParam>;
}): Promise<EntityCoreResponse<IProtocol>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IProtocol>>(`${baseUri}/${id}`, {
    queryParams: { expand: toExpandQueryParam(expand) },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
