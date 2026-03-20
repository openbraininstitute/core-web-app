import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  IValidationResult,
  IValidationResultFilter,
} from '@/api/entitycore/types/entities/validation-result';
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
}: {
  filters?: Partial<IValidationResultFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IValidationResult>>(baseUri, {
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
 * Retrieves a specific validation result by its ID from the Entity Core API.
 *
 * @param context - Optional workspace context for the request, which may include authentication and other headers.
 * @param id - The unique identifier of the validation result to retrieve.
 * @returns A promise that resolves to the requested `IValidationResult` object.
 */
export async function getValidationResult({
  context,
  id,
}: {
  context?: WorkspaceContext | null;
  id: string;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IValidationResult>>(baseUri, {
    queryParams: {
      id,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
