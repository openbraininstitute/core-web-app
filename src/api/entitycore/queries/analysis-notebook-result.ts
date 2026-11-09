import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  IAnalysisNotebookResult,
  TAnalysisNotebookResultFilter,
} from '@/api/entitycore/types/entities/analysis-notebook-result';
import type { TAnyEntityExpandParam } from '@/api/entitycore/types/shared/expand';
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
  expand?: ReadonlyArray<TAnyEntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IAnalysisNotebookResult>>(baseUri, {
    queryParams: {
      expand,
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
  expand?: ReadonlyArray<TAnyEntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<IAnalysisNotebookResult>(`${baseUri}/${id}`, {
    queryParams: { expand },
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
