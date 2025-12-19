import z from 'zod';

import { authApiClient } from '@/api/apiClient';
import type { IPersonFilter } from '@/api/entitycore/types/entities/agent';
import type { IContributor } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { config } from '@/config';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/contribution';
/**
 * Retrieves a list of people from the EntityCoreAPI.

 * @returns {Promise<EntityCoreResponse<IPerson>>} A promise that resolves to the list of people (contributors)
 */
export async function getContributions({
  context,
  filters,
}: {
  context: WorkspaceContext;
  filters: Partial<IPersonFilter>;
}) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<EntityCoreResponse<IContributor>>(baseUri, {
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
 * Retrieves one person from the EntityCoreAPI.

 * @returns {Promise<IContributor>} A promise that resolves to the single person
 */
export async function getContribution({ id, context }: { id: string; context: WorkspaceContext }) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<IContributor>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

const contributorPayloadSchema = z.object({
  agent_id: z.string().uuid(),
  role_id: z.string().uuid(),
  entity_id: z.string().uuid(),
});

export type IContributorPayload = z.infer<typeof contributorPayloadSchema>;

/**
 * Creates a contributor in the Entity Core API.
 *
 * @param contributor - The contributor to create.
 * @returns A promise that resolves to the created contributor.
 */
export async function createContribution({
  context,
  contributor,
}: {
  context: WorkspaceContext;
  contributor: IContributorPayload;
}) {
  const api = await authApiClient(config.ENTITY_CORE_URL);

  return await api.post<IContributor>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: contributor,
  });
}
