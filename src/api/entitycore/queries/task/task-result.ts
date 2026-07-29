import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  ITaskResult,
  ITaskResultFilter,
  TCreateTaskResult,
  TUpdateTaskResult,
} from '@/api/entitycore/types/entities/task-result';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/task-result';

/**
 * Retrieves a paginated list of task results.
 */
export async function getTaskResults<T extends Record<string, unknown>>({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ITaskResultFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ITaskResult<T>>>(baseUri, {
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
 * Retrieves a single task result by ID.
 */
export async function getTaskResult<T extends Record<string, unknown>>({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ITaskResult<T>>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Creates a new task result.
 */
export async function createTaskResult<T extends Record<string, unknown>>({
  data,
  context,
}: {
  data: TCreateTaskResult;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ITaskResult<T>>(baseUri, {
    body: data,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Updates an existing task result.
 */
export async function updateTaskResult<T extends Record<string, unknown>>({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateTaskResult;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<ITaskResult<T>>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Deletes a task result by ID.
 */
export async function deleteTaskResult({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.delete(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
