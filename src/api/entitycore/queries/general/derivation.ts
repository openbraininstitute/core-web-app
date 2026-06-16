import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  IDerivationBase,
  IDerivationFilter,
  IDerivationForwardFilter,
  IDerivationRead,
} from '@/api/entitycore/types/entities/derivation';
import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';
import type { KebabCase, NormalizeChars } from '@/utils/type';

const DerivationBaseUri = '/derivation';

export async function searchDerivations({
  filters,
  context,
}: {
  filters: IDerivationForwardFilter;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IDerivationRead>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IDerivationRead>>(DerivationBaseUri, {
    queryParams: {
      ...filters,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves derivations for a specific entity using the provided route, entity id, and filter parameters.
 *
 * @param params - The parameters for the derivation query.
 * @param params.entityRoute - The API route for the entity.
 * @param params.entityId - The unique identifier of the entity.
 * @param params.filters - The filters to apply to the derivation query.
 * @returns A promise that resolves to an `EntityCoreResponse` containing an array of `IDerivationBase` objects.
 *
 * @remarks
 * The API instance is cached for one day. Consider extracting caching logic to a dedicated function.
 */
export async function getEntityDerivations({
  context,
  entityRoute,
  entityId,
  filters,
}: {
  context?: WorkspaceContext | null;
  entityRoute: KebabCase<NormalizeChars<TEntityTypeDict>>;
  entityId: string;
  filters?: Partial<IDerivationFilter>;
}): Promise<EntityCoreResponse<IDerivationBase>> {
  const api = await entityCoreApi();
  return await api.get(`/${entityRoute}/${entityId}/derived-from`, {
    queryParams: {
      ...(filters ?? {}),
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
