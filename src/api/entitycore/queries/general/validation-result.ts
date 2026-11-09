import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  IValidationResult,
  IValidationResultFilter,
} from '@/api/entitycore/types/entities/validation-result';
import type { TAnyEntityExpandParam } from '@/api/entitycore/types/shared/expand';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/validation-result';

/**
 * Retrieves a list of validation results from the Entity Core API.
 *
 * @param filters - Optional filters to apply to the validation result query.
 * @param context - Optional workspace context for the request.
 * @returns A promise that resolves to the EntityCoreResponse containing validation result data.
 */
export async function getValidationResults({
  filters,
  context,
  expand,
}: {
  filters?: Partial<IValidationResultFilter>;
  context?: WorkspaceContext | null;
  expand?: ReadonlyArray<TAnyEntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IValidationResult>>(baseUri, {
    queryParams: {
      expand,
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
 * Retrieves a specific validation result by its ID from the Entity Core API.
 *
 * @param context - Optional workspace context for the request, which may include authentication and other headers.
 * @param id - The unique identifier of the validation result to retrieve.
 * @returns A promise that resolves to the requested `IValidationResult` object.
 */
export async function getValidationResult({
  context,
  id,
  expand,
}: {
  context?: WorkspaceContext | null;
  id: string;
  expand?: ReadonlyArray<TAnyEntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IValidationResult>>(baseUri, {
    queryParams: {
      expand,
      id,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
