import z from 'zod';

import { getEntityCoreContext } from '@/api/entitycore/utils';
import { authApiClient } from '@/api/apiClient';
import { config } from '@/config';

import type { IETypeClassification } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/etype-classification';
/**
 * Retrieves a list of etype classifications from the EntityCoreAPI.

 * @returns {Promise<EntityCoreResponse<IEType>>} A promise that resolves to the list of etypes
 */
export async function getEtypeClassifications({
  filters,
  ctx,
}: {
  filters?: any;
  ctx?: WorkspaceContext;
}) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<EntityCoreResponse<IETypeClassification>>(baseUri, {
    ...getEntityCoreContext(ctx),
    queryParams: {
      ...filters,
    },
  });
}

/**
 * Retrieves one etype classification from the EntityCoreAPI.

 * @returns {Promise<IEType>} A promise that resolves to the single etype
 */
export async function getEtypeClassification({ id }: { id: string }) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<IETypeClassification>(`${baseUri}/${id}`, undefined, {
    cache: { cacheName: 'etype', enabled: true, ttlInSeconds: 86_400 },
  });
}

export const etypeClassificationCreateSchema = z.object({
  authorized_public: z.boolean(),
  entity_id: z.string().uuid(),
  etype_class_id: z.string().uuid(),
});

export type TEtypeClassificationCreate = z.infer<typeof etypeClassificationCreateSchema>;

/**
 * Creates a new etype classification
 * @param param0
 * @returns A promise that resolves to the created etype classification
 */
export async function createEtypeClassification({
  context,
  payload,
}: {
  context: WorkspaceContext;
  payload: TEtypeClassificationCreate;
}) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.post<IETypeClassification>(baseUri, {
    ...getEntityCoreContext(context),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}
