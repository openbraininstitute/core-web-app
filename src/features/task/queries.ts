import { uniq } from 'es-toolkit/compat';

import { getTaskActivities, getTaskConfigs } from '@/api/entitycore/queries/task';
import { TASK_ID_FILTER_CHUNK_SIZE, TASK_PAGE_SIZE } from '@/features/task/constants';
import { fetchChunkedPages } from '@/features/task/query-utils';

import type {
  ITaskActivity,
  TTaskActivityType,
} from '@/api/entitycore/types/entities/task-activity';
import type {
  ITaskConfig,
  ITaskConfigFilter,
  TTaskConfigType,
} from '@/api/entitycore/types/entities/task-config';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

export function toEntityCoreResponse<T>(
  data: T[],
  fallbackPageSize = TASK_PAGE_SIZE
): EntityCoreResponse<T> {
  return {
    data,
    pagination: {
      page: 1,
      page_size: data.length || fallbackPageSize,
      total_items: data.length,
    },
  };
}

export async function listAllTaskActivities({
  context,
  filters,
  pageSize = TASK_PAGE_SIZE,
}: {
  context?: WorkspaceContext | null;
  filters: Parameters<typeof getTaskActivities>[0]['filters'];
  pageSize?: number;
}) {
  const activities: ITaskActivity[] = [];
  let page = 1;

  while (true) {
    const response = await getTaskActivities({
      context,
      withFacets: false,
      filters: { ...filters, page, page_size: pageSize },
    });
    activities.push(...response.data);

    if (response.data.length < pageSize) break;
    page += 1;
  }

  return toEntityCoreResponse(activities, pageSize);
}

export async function listTaskActivitiesByUsedIds({
  context,
  taskActivityType,
  usedIds,
  pageSize = TASK_PAGE_SIZE,
  chunkSize = TASK_ID_FILTER_CHUNK_SIZE,
}: {
  context?: WorkspaceContext | null;
  taskActivityType: TTaskActivityType;
  usedIds: string[];
  pageSize?: number;
  chunkSize?: number;
}) {
  const data = await fetchChunkedPages({
    values: usedIds,
    chunkSize,
    pageSize,
    prepareValues: uniq,
    fetchPage: async ({ chunkValues, page, pageSize }) => {
      const response = await getTaskActivities({
        context,
        withFacets: false,
        filters: {
          task_activity_type: taskActivityType,
          used__id__in: chunkValues,
          page,
          page_size: pageSize,
        },
      });
      return { data: response.data };
    },
  });

  return toEntityCoreResponse(data, pageSize);
}

export async function listTaskConfigsByIds<TMeta extends Record<string, unknown>>({
  context,
  taskConfigType,
  ids,
  pageSize = TASK_PAGE_SIZE,
  chunkSize = TASK_ID_FILTER_CHUNK_SIZE,
}: {
  context?: WorkspaceContext | null;
  taskConfigType: TTaskConfigType;
  ids: string[];
  pageSize?: number;
  chunkSize?: number;
}) {
  const data = await fetchChunkedPages({
    values: ids,
    chunkSize,
    pageSize,
    prepareValues: uniq,
    fetchPage: async ({ chunkValues, page, pageSize }) => {
      const response = await getTaskConfigs<TMeta>({
        context,
        withFacets: false,
        filters: {
          task_config_type: taskConfigType,
          id__in: chunkValues,
          page,
          page_size: pageSize,
        },
      });
      return { data: response.data };
    },
  });

  return toEntityCoreResponse(data, pageSize);
}

export async function listTaskConfigsPageByIds<TMeta extends Record<string, unknown>>({
  context,
  taskConfigType,
  ids,
  page,
  pageSize = TASK_PAGE_SIZE,
}: {
  context?: WorkspaceContext | null;
  taskConfigType: TTaskConfigType;
  ids: string[];
  page: number;
  pageSize?: number;
}) {
  const uniqueIds = uniq(ids);
  const pageIds = uniqueIds.slice((page - 1) * pageSize, page * pageSize);

  if (pageIds.length === 0) {
    return {
      ...toEntityCoreResponse<ITaskConfig<TMeta>>([], pageSize),
      pagination: { page, page_size: pageSize, total_items: uniqueIds.length },
    };
  }

  const response = await getTaskConfigs<TMeta>({
    context,
    withFacets: false,
    filters: {
      task_config_type: taskConfigType,
      id__in: pageIds,
      page: 1,
      page_size: pageSize,
    } satisfies Partial<ITaskConfigFilter>,
  });

  return {
    ...response,
    pagination: {
      ...response.pagination,
      page,
      page_size: pageSize,
      total_items: uniqueIds.length,
    },
  };
}
