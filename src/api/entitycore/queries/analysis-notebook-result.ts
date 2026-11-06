import { toExpandQueryParam } from '@/api/entitycore/types/shared/expand';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  IAnalysisNotebookResult,
  TAnalysisNotebookResultFilter,
} from '@/api/entitycore/types/entities/analysis-notebook-result';
import type { EntityExpandParam } from '@/api/entitycore/types/shared/expand';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/analysis-notebook-result';

/**
 * Retrieves a list of analysis notebook results from the EntityCoreAPI.
 */
export async function getAnalysisNotebookResults({
  withFacets,
  filters,
  context,
  expand,
}: {
  withFacets?: boolean;
  filters?: TAnalysisNotebookResultFilter;
  context?: WorkspaceContext | null;
  /** entitycore `expand` values, sent as repeated `expand=` params. */
  expand?: ReadonlyArray<EntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IAnalysisNotebookResult>>(baseUri, {
    queryParams: {
      expand: toExpandQueryParam(expand),
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
 * Retrieves a specific analysis notebook result by its ID from the EntityCoreAPI.
 */
export async function getAnalysisNotebookResult({
  id,
  context,
  expand,
}: {
  id: string;
  context?: WorkspaceContext | null;
  /** entitycore `expand` values, sent as repeated `expand=` params. */
  expand?: ReadonlyArray<EntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<IAnalysisNotebookResult>(`${baseUri}/${id}`, {
    queryParams: { expand: toExpandQueryParam(expand) },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Deletes a specific analysis notebook result by its ID from the EntityCoreAPI.
 */
export async function deleteAnalysisNotebookResult({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext;
}) {
  const api = await entityCoreApi();
  return await api.delete<void>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
