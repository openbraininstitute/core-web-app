import { EntityCoreResponse } from '../../types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type {
  IBrainAtlas,
  IBrainAtlasRegion,
  IBrainAtlasFilter,
  IBrainAtlasRegionFilter,
} from '@/api/entitycore/types/entities/brain-atlas';
import { WorkspaceContext } from '@/types/common';

const baseUri = '/brain-atlas';

/**
 * Retrieves a list of brain atlases from the Entity Core API.
 *
 * @param params - The parameters for the request.
 * @param params.filters - Optional filters to apply to the brain atlas query.
 * @param params.context - Optional workspace context for the request.
 * @returns A promise that resolves to the EntityCoreResponse containing brain atlas data.
 */
export async function getBrainAtlases({
  filters,
  context,
}: {
  filters?: Partial<IBrainAtlasFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IBrainAtlas>>(baseUri, {
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
 * Retrieves a Brain Atlas entity by its ID from the Entity Core API.
 *
 * @param params - The parameters for the request.
 * @param params.id - The unique identifier of the Brain Atlas to retrieve.
 * @param params.context - Optional workspace context for the request, which may include authentication and other headers.
 * @returns A promise that resolves to the requested `IBrainAtlas` object.
 */
export async function getBrainAtlas({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IBrainAtlas>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves the regions for a specified brain atlas.
 *
 * @param params - The parameters for the request.
 * @param params.atlasId - The unique identifier of the brain atlas.
 * @param params.filters - Optional filters to apply when retrieving regions.
 * @param params.context - Optional workspace context for the request.
 * @returns A promise that resolves to the response containing brain atlas regions.
 */
export async function getBrainAtlasRegions({
  atlasId,
  filters,
  context,
}: {
  atlasId: string;
  filters?: Partial<IBrainAtlasRegionFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IBrainAtlasRegion>>(`${baseUri}/${atlasId}/regions`, {
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
 * Fetches a specific brain atlas region by its ID and atlas ID.
 *
 * @param params - The parameters for the request.
 * @param params.id - The unique identifier of the brain atlas region.
 * @param params.atlasId - The unique identifier of the brain atlas.
 * @param params.context - Optional workspace context for the request.
 * @returns A promise that resolves to the brain atlas region data wrapped in an EntityCoreResponse.
 */
export async function getBrainAtlasRegion({
  atlasRegionId,
  atlasId,
  context,
}: {
  atlasRegionId: string;
  atlasId: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IBrainAtlasRegion>(`${baseUri}/${atlasId}/regions/${atlasRegionId}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
