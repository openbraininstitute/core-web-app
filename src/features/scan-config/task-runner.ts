'use client';

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { includes, uniq } from 'es-toolkit/compat';
import { useCallback } from 'react';

import { getTaskActivities, getTaskConfigs } from '@/api/entitycore/queries/task';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ApiError } from '@/api/error';
import { runTask } from '@/api/one/runner';
import { useAppNotification } from '@/components/notification';
import { useRunWithOfflineTokenConsent } from '@/features/offline-auth-management';
import { errorRegistry } from '@/features/scan-config/error-registry';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { getErrorMessage } from '@/utils/error';
import { log } from '@/utils/logger';
import { fetchAllChunkedPaginatedData, fetchAllPaginatedData } from '@/utils/pagination';

import type { TTaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig, TTaskConfigType } from '@/api/entitycore/types/entities/task-config';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TObiOneTaskType } from '@/api/one/types/task';
import type { WorkspaceContext } from '@/types/common';

/** default interval when execution activities are still pending or running. */
export const SCAN_CONFIG_TASK_STATUS_POLL_INTERVAL_MS = 10_000;
const SCAN_CONFIG_TASK_PAGE_SIZE = 50;

const TASK_ACTIVITIES_QUERY_KEY_HEAD = 'data-task-activities' as const;
const TASK_RUNNER_QUERY_KEY_HEAD = 'data-task-runner' as const;

function toEntityCoreResponse<T>(data: T[], fallbackPageSize: number): EntityCoreResponse<T> {
  return {
    data,
    pagination: {
      page: 1,
      page_size: data.length || fallbackPageSize,
      total_items: data.length,
    },
  };
}
/**
 * invalidates all task-activity queries for the given execution activity type in the workspace
 * use after mutating executions when the exact `used__id__in` filter is inconvenient
 */
export function invalidateScanConfigExecutionActivities({
  queryClient,
  context,
  executionActivityType,
}: {
  queryClient: QueryClient;
  context: WorkspaceContext;
  executionActivityType: TTaskActivityType;
}) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      if (key[0] !== TASK_ACTIVITIES_QUERY_KEY_HEAD) return false;
      const params = key[1] as Record<string, unknown> | undefined;
      if (!params) return false;
      return (
        params.virtualLabId === context.virtualLabId &&
        params.projectId === context.projectId &&
        params.task_activity_type === executionActivityType
      );
    },
  });
}

export type TScanConfigLaunchMutationOptions = {
  context: WorkspaceContext;
  /** passed to obi-one `/declared/task/launch` */
  obiOneTaskType: TObiOneTaskType;
  /** entity-core execution activities to refresh after a successful launch */
  executionActivityType: TTaskActivityType;
  /** antd notification key for deduplicating toasts */
  notificationKey: string;
  /** fallback user-facing message when launch fails */
  failureMessage: string;
  /** short name for logs, e.g. "Extraction" */
  logTopic: string;
};

/**
 * Launches an obi-one task for a task-config id, then invalidates matching entity-core execution
 * activities so the task runner queries refetch.
 */
export function useScanConfigLaunchMutation({
  context,
  obiOneTaskType,
  executionActivityType,
  notificationKey,
  failureMessage,
  logTopic,
}: TScanConfigLaunchMutationOptions) {
  const queryClient = useQueryClient();
  const notification = useAppNotification();
  const logTopicLower = logTopic.toLowerCase();

  const { runWithConsent } = useRunWithOfflineTokenConsent();

  const handleTaskError = useCallback(
    (error: unknown, configId: string) => {
      log('error', `Failed to launch ${logTopicLower} for config ${configId}`, error);
      if (error instanceof ApiError) {
        const code = error.cause?.code;
        const apiMessage = error.cause?.message ?? failureMessage;
        const message = code ? getErrorMessage(code, errorRegistry, apiMessage) : apiMessage;
        notification.error({ message, duration: 5, key: notificationKey });
        return;
      }
      notification.error({ message: failureMessage, duration: 5, key: notificationKey });
    },
    [failureMessage, logTopicLower, notification, notificationKey]
  );

  return useMutation({
    throwOnError: false,
    mutationKey: [TASK_RUNNER_QUERY_KEY_HEAD, { obiOneTaskType, context }],
    mutationFn: (configIds: string[]) =>
      runWithConsent({
        fn: async () => {
          for (const configId of configIds) {
            try {
              const executionId = await runTask({
                ctx: context,
                task_type: obiOneTaskType,
                config_id: configId,
              });
              log('info', `${logTopic} for ${configId} launched successfully, execution ID`, {
                executionId,
              });
            } catch (error) {
              handleTaskError(error, configId);
            }
          }
          await invalidateScanConfigExecutionActivities({
            queryClient,
            context,
            executionActivityType,
          });
        },
      }),
  });
}

export type TScanConfigTaskRunnerConfigs<TMeta extends Record<string, unknown>> = {
  configList: ITaskConfig<TMeta>[];
  configIds: string[];
};

export type TUseScanConfigTaskRunnerParams = {
  context: WorkspaceContext;
  /** campaign id the config-generation activity used */
  campaignId: string;
  configGenerationActivityType: TTaskActivityType;
  executionActivityType: TTaskActivityType;
  taskConfigType: TTaskConfigType;
  /** when true, pauses polling of execution activities while a launch mutation is in flight. */
  pauseExecutionPolling?: boolean;
};

/**
 * loads config-generation activity → task configs → execution activities for a scan-config workflow
 */
export function useScanConfigTaskRunner<TMeta extends Record<string, unknown>>({
  context,
  campaignId,
  configGenerationActivityType,
  executionActivityType,
  taskConfigType,
  pauseExecutionPolling = false,
}: TUseScanConfigTaskRunnerParams) {
  const { data: configGenerationIds, isPending: configGenerationLoading } = useQuery({
    queryKey: keyBuilder.taskActivities({
      context,
      filters: {
        task_activity_type: configGenerationActivityType,
        used__id: campaignId,
      },
    }),
    queryFn: async () => {
      const filters = {
        task_activity_type: configGenerationActivityType,
        used__id: campaignId,
      };
      const allActivities = await fetchAllPaginatedData({
        fn: async (page, pageSize) => {
          const res = await getTaskActivities({
            filters: { ...filters, page, page_size: pageSize },
            withFacets: false,
            context,
          });
          return { data: res.data || [] };
        },
        pageSize: SCAN_CONFIG_TASK_PAGE_SIZE,
      });

      return toEntityCoreResponse(allActivities, SCAN_CONFIG_TASK_PAGE_SIZE);
    },
    enabled: Boolean(campaignId),
    select: (data) => data.data.at(0)?.generated?.map((g) => g.id) ?? [],
  });

  const { data: configsResponse, isLoading: configsLoading } = useQuery({
    queryKey: keyBuilder.taskConfigs({
      context,
      filters: {
        task_config_type: taskConfigType,
        id__in: configGenerationIds,
      },
    }),
    queryFn: async () => {
      const allConfigs = await fetchAllChunkedPaginatedData({
        values: configGenerationIds ?? [],
        chunkSize: SCAN_CONFIG_TASK_PAGE_SIZE,
        pageSize: SCAN_CONFIG_TASK_PAGE_SIZE,
        prepareValues: uniq,
        fetchPage: async ({ chunkValues, page, pageSize }) => {
          const res = await getTaskConfigs<TMeta>({
            filters: {
              task_config_type: taskConfigType,
              id__in: chunkValues,
              page,
              page_size: pageSize,
            },
            withFacets: false,
            context,
          });
          return { data: res.data || [] };
        },
      });

      return toEntityCoreResponse(allConfigs, SCAN_CONFIG_TASK_PAGE_SIZE);
    },
    enabled: Boolean(configGenerationIds && configGenerationIds.length > 0),
    select: (data) => {
      const configs = data.data;
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      const configList = [...(configs ?? [])].sort((a, b) => collator.compare(a.name, b.name));
      const configIds = configList.map((c) => c.id);
      return { configList, configIds } as TScanConfigTaskRunnerConfigs<TMeta>;
    },
  });

  const { data: executionsResponse, isLoading: executionsLoading } = useQuery({
    queryKey: keyBuilder.taskActivities({
      context,
      filters: {
        task_activity_type: executionActivityType,
        used__id__in: configsResponse?.configIds ?? [],
      },
    }),
    queryFn: async () => {
      const allExecutions = await fetchAllChunkedPaginatedData({
        values: configsResponse?.configIds ?? [],
        chunkSize: SCAN_CONFIG_TASK_PAGE_SIZE,
        pageSize: SCAN_CONFIG_TASK_PAGE_SIZE,
        prepareValues: uniq,
        fetchPage: async ({ chunkValues, page, pageSize }) => {
          const res = await getTaskActivities({
            filters: {
              task_activity_type: executionActivityType,
              used__id__in: chunkValues,
              page,
              page_size: pageSize,
            },
            context,
          });
          return { data: res.data || [] };
        },
      });

      return toEntityCoreResponse(allExecutions, SCAN_CONFIG_TASK_PAGE_SIZE);
    },
    enabled: Boolean(configsResponse?.configIds && configsResponse.configIds.length > 0),
    refetchInterval: (query) => {
      const executions = query.state.data?.data ?? [];
      const hasActive = executions.some((exec) =>
        includes([ActivityStatus.PENDING, ActivityStatus.RUNNING], exec.status)
      );
      return hasActive && !pauseExecutionPolling ? SCAN_CONFIG_TASK_STATUS_POLL_INTERVAL_MS : false;
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
