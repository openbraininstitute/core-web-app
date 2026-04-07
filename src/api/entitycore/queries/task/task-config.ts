import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  ITaskConfig,
  ITaskConfigFilter,
  TCreateTaskConfig,
  TUpdateTaskConfig,
} from '@/api/entitycore/types/entities/task-config';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/task-config';

/**
 * Retrieves a paginated list of task configs.
 */
export async function getTaskConfigs<T extends Record<string, unknown>>({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ITaskConfigFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ITaskConfig<T>>>(baseUri, {
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
 * Retrieves a single task config by ID.
 */
export async function getTaskConfig<T extends Record<string, unknown>>({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ITaskConfig<T>>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Creates a new task config.
 */
export async function createTaskConfig<T extends Record<string, unknown>>({
  data,
  context,
}: {
  data: TCreateTaskConfig;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ITaskConfig<T>>(baseUri, {
    body: data,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Updates an existing task config.
 */
export async function updateTaskConfig<T extends Record<string, unknown>>({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateTaskConfig;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<ITaskConfig<T>>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Deletes a task config by ID.
 */
export async function deleteTaskConfig({
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
