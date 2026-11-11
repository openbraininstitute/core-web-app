import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  ITaskActivity,
  ITaskActivityFilter,
  TCreateTaskActivity,
  TUpdateTaskActivity,
} from '@/api/entitycore/types/entities/task-activity';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/task-activity';

/**
 * Retrieves a paginated list of task activities.
 */
export async function getTaskActivities({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ITaskActivityFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ITaskActivity>>(baseUri, {
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
 * Retrieves a single task activity by ID.
 */
export async function getTaskActivity({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ITaskActivity>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Creates a new task activity.
 */
export async function createTaskActivity({
  data,
  context,
}: {
  data: TCreateTaskActivity;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ITaskActivity>(baseUri, {
    body: data,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Updates an existing task activity.
 */
export async function updateTaskActivity({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateTaskActivity;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<ITaskActivity>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Deletes a task activity by ID.
 */
export async function deleteTaskActivity({
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
