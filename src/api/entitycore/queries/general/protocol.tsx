import type { IProtocol } from '@/api/entitycore/types/shared/global';
import type { IProtocolFilter } from '@/api/entitycore/types/shared/protocol';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';
import { compactRecord } from '@/utils/dictionary';

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
}: {
  filters?: Partial<IProtocolFilter>;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IProtocol>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IProtocol>>(baseUri, {
    queryParams: compactRecord({
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
}: {
  id: string;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IProtocol>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IProtocol>>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
