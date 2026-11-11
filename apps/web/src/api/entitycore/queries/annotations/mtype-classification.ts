import z from 'zod';

import { authApiClient } from '@/api/api-client';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { config } from '@/config';

import type { IMTypeClassification } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/mtype-classification';
/**
 * Retrieves a list of mtype classifications from the EntityCoreAPI.

 * @returns {Promise<EntityCoreResponse<IMType>>} A promise that resolves to the list of mtypes
 */
export async function getMtypeClassifications({
  filters,
  ctx,
}: {
  filters?: any;
  ctx?: WorkspaceContext;
}) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<EntityCoreResponse<IMTypeClassification>>(baseUri, {
    ...getEntityCoreContext(ctx),
    queryParams: {
      ...filters,
    },
  });
}

/**
 * Retrieves one mtype classification from the EntityCoreAPI.

 * @returns {Promise<IMType>} A promise that resolves to the single mtype
 */
export async function getMtypeClassification({ id }: { id: string }) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<IMTypeClassification>(`${baseUri}/${id}`, undefined, {
    cache: { cacheName: 'mtype', enabled: true, ttlInSeconds: 86_400 },
  });
}

export const mtypeClassificationCreateSchema = z.object({
  authorized_public: z.boolean(),
  entity_id: z.string().uuid(),
  mtype_class_id: z.string().uuid(),
});

export type TMtypeClassificationCreate = z.infer<typeof mtypeClassificationCreateSchema>;

/**
 * Creates a new mtype classification
 * @param param0
 * @returns A promise that resolves to the created mtype classification
 */
export async function createMtypeClassification({
  context,
  payload,
}: {
  context: WorkspaceContext;
  payload: TMtypeClassificationCreate;
}) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.post<IMTypeClassification>(baseUri, {
    ...getEntityCoreContext(context),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}
