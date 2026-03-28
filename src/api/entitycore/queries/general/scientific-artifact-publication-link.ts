import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  IScientificArtifactPublicationLink,
  IScientificArtifactPublicationLinkFilter,
} from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/scientific-artifact-publication-link';

/**
 * Retrieves scientific artifact publication links from the EntityCore API.
 *
 * @param withFacets - Optional flag to include facet information in the response.
 * @param filters - Filter criteria for querying scientific artifact publication links.
 * @param context - Workspace context containing authentication and environment details.
 * @returns A promise resolving to the EntityCore response containing scientific artifact publication links.
 */
export async function getScientificArtifactPublicationLinks({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters: Partial<IScientificArtifactPublicationLinkFilter>;
  context: WorkspaceContext;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IScientificArtifactPublicationLink>>(baseUri, {
    queryParams: compactRecord({
      ...filters,
      with_facets: withFacets,
    }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a scientific artifact publication link by its ID.
 *
 * @param id - The unique identifier of the scientific artifact publication link.
 * @param context - The workspace context containing authentication and request metadata.
 * @returns A promise that resolves to the scientific artifact publication link object.
 */
export async function getScientificArtifactPublicationLink({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext;
}) {
  const api = await entityCoreApi();
  return await api.get<IScientificArtifactPublicationLink>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
