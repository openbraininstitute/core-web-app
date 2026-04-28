'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { includes } from 'es-toolkit/compat';
import { useMemo } from 'react';

import {
  ActivityStatus,
  type TTaskActivityType,
} from '@/api/entitycore/types/entities/task-activity';
import {
  TASK_ACTIVITIES_QUERY_KEY_HEAD,
  TASK_PAGE_SIZE,
  TASK_RUNNER_QUERY_KEY_HEAD,
  TASK_STATUS_POLL_INTERVAL_MS,
} from '@/features/task-runner/constants';
import {
  listAllTaskActivities,
  listTaskActivitiesByUsedIds,
  listTaskConfigsByIds,
  listTaskConfigsPageByIds,
} from '@/features/task-runner/functions';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ITaskConfig, TTaskConfigType } from '@/api/entitycore/types/entities/task-config';
import type { WorkspaceContext } from '@/types/common';

export type TTaskRunnerConfigs<TMeta extends Record<string, unknown>> = {
  configList: ITaskConfig<TMeta>[];
  configIds: string[];
};

export type TUseTaskRunnerParams = {
  context: WorkspaceContext;
  campaignId: string;
  configGenerationActivityType: TTaskActivityType;
  executionActivityType: TTaskActivityType;
  taskConfigType: TTaskConfigType;
  pauseExecutionPolling?: boolean;
};

// campaign-level orchestrator:
// resolves generated config ids, loads the full config set, and keeps full execution state fresh.
export function useTaskRunner<TMeta extends Record<string, unknown>>({
  context,
  campaignId,
  configGenerationActivityType,
  executionActivityType,
  taskConfigType,
  pauseExecutionPolling = false,
}: TUseTaskRunnerParams) {
  const { data: configGenerationIds, isPending: configGenerationLoading } = useQuery({
    queryKey: keyBuilder.taskActivities({
      context,
      filters: {
        task_activity_type: configGenerationActivityType,
        used__id: campaignId,
      },
    }),
    queryFn: async () => {
      const activities = await listAllTaskActivities({
        context,
        filters: {
          task_activity_type: configGenerationActivityType,
          used__id: campaignId,
        },
        pageSize: TASK_PAGE_SIZE,
      });

      return activities;
    },
    enabled: Boolean(campaignId),
    select: (data) => data.data.at(0)?.generated?.map((g) => g.id) ?? [],
  });

  const { data: configsResponse, isLoading: configsLoading } = useQuery({
    queryKey: [
      TASK_RUNNER_QUERY_KEY_HEAD,
      {
        ...context,
        task_config_type: taskConfigType,
        generated_config_ids: configGenerationIds ?? [],
      },
    ],
    queryFn: async () => {
      const configs = await listTaskConfigsByIds<TMeta>({
        ids: configGenerationIds ?? [],
        taskConfigType,
        context,
      });

      return configs;
    },
    enabled: Boolean(configGenerationIds && configGenerationIds.length > 0),
    select: (data) => {
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      const configList = [...(data.data ?? [])].sort((a, b) => collator.compare(a.name, b.name));
      const configIds = configList.map((config) => config.id);
      return { configList, configIds } as TTaskRunnerConfigs<TMeta>;
    },
  });

  const { data: executionsResponse, isLoading: executionsLoading } = useQuery({
    queryKey: [
      TASK_ACTIVITIES_QUERY_KEY_HEAD,
      {
        ...context,
        task_activity_type: executionActivityType,
        used_ids: configsResponse?.configIds ?? [],
      },
    ],
    queryFn: () =>
      listTaskActivitiesByUsedIds({
        usedIds: configsResponse?.configIds ?? [],
        taskActivityType: executionActivityType,
        context,
      }),
    enabled: Boolean(configsResponse?.configIds && configsResponse.configIds.length > 0),
    refetchInterval: (query) => {
      const executions = query.state.data?.data ?? [];
      const hasActive = executions.some((exec) =>
        includes([ActivityStatus.PENDING, ActivityStatus.RUNNING], exec.status)
      );
      return hasActive && !pauseExecutionPolling ? TASK_STATUS_POLL_INTERVAL_MS : false;
    },
  });

  return {
    configGenerationIds,
    configGenerationLoading,
    configsResponse,
    configsLoading,
    executionsResponse,
    executionsLoading,
  };
}

export type TUseVisibleTaskConfigsParams = {
  context: WorkspaceContext;
  taskConfigType: TTaskConfigType;
  executionActivityType: TTaskActivityType;
  ids?: string[] | null;
  pageSize?: number;
};

// viewport-level helper:
// loads configs incrementally for infinite scrolling and fetches executions only for visible configs.
export function usePaginatedTaskConfigsWithVisibleExecutions<
  TMeta extends Record<string, unknown>,
>({
  context,
  taskConfigType,
  executionActivityType,
  ids,
  pageSize = TASK_PAGE_SIZE,
}: TUseVisibleTaskConfigsParams) {
  const {
    data: configPages,
    isLoading: configPageLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['task-configs-page-by-ids', context, taskConfigType, ids, pageSize],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listTaskConfigsPageByIds<TMeta>({
        ids: ids ?? [],
        taskConfigType,
        page: pageParam,
        pageSize,
        context,
      }),
    enabled: Boolean(ids && ids.length > 0),
    select: (data) => {
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          data: [...page.data].sort((a, b) => collator.compare(a.name, b.name)),
        })),
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.data.length < pageSize ? undefined : lastPage.pagination.page + 1,
  });

  const visibleConfigs = useMemo(
    () => configPages?.pages.flatMap((page) => page.data) ?? [],
    [configPages]
  );
  const visibleConfigIds = useMemo(
    () => visibleConfigs.map((config) => config.id),
    [visibleConfigs]
  );

  const { data: visibleExecutionsResponse, isLoading: visibleExecutionsLoading } = useQuery({
    queryKey: keyBuilder.taskActivities({
      context,
      filters: {
        task_activity_type: executionActivityType,
        used__id__in: visibleConfigIds,
      },
    }),
    queryFn: () =>
      listTaskActivitiesByUsedIds({
        taskActivityType: executionActivityType,
        usedIds: visibleConfigIds,
        context,
      }),
    enabled: visibleConfigIds.length > 0,
  });

  return {
    configPageLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    visibleConfigs,
    visibleConfigIds,
    visibleExecutionsResponse,
    visibleExecutionsLoading,
  };
}
