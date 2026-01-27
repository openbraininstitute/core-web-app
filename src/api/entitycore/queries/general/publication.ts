import type { IPublication, IPublicationFilter } from '@/api/entitycore/types/entities/publication';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/publication';

/**
 * Retrieves publications from the EntityCore API.
 *
 * @param withFacets - Optional flag to include facet information in the response.
 * @param filters - Filter criteria for querying publications.
 * @param context - Workspace context containing authentication and environment details.
 * @returns A promise resolving to the EntityCore response containing publications.
 */
export async function getPublications({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters: IPublicationFilter;
  context: WorkspaceContext;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IPublication>>(baseUri, {
    queryParams: {
      ...filters,
      with_facets: withFacets,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a publication by its ID.
 *
 * @param id - The unique identifier of the publication.
 * @param context - The workspace context containing authentication and request metadata.
 * @returns A promise that resolves to the publication object.
 */
export async function getPublication({ id, context }: { id: string; context: WorkspaceContext }) {
  const api = await entityCoreApi();
  return await api.get<IPublication>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
