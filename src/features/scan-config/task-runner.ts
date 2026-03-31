'use client';

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { includes } from 'es-toolkit/compat';

import { getTaskActivities, getTaskConfigs } from '@/api/entitycore/queries/task';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ApiError } from '@/api/error';
import { runTask } from '@/api/one/runner';
import { useAppNotification } from '@/components/notification';
import { errorRegistry } from '@/features/scan-config/error-registry';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { getErrorMessage } from '@/utils/error';
import { log } from '@/utils/logger';

import type { TTaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig, TTaskConfigType } from '@/api/entitycore/types/entities/task-config';
import type { TObiOneTaskType } from '@/api/one/types/task';
import type { WorkspaceContext } from '@/types/common';

/** default interval when execution activities are still pending or running. */
export const SCAN_CONFIG_TASK_STATUS_POLL_INTERVAL_MS = 10_000;

const TASK_ACTIVITIES_QUERY_KEY_HEAD = 'data-task-activities' as const;
const TASK_RUNNER_QUERY_KEY_HEAD = 'data-task-runner' as const;
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
  queryClient.invalidateQueries({
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

  return useMutation({
    throwOnError: false,
    mutationKey: [TASK_RUNNER_QUERY_KEY_HEAD, { obiOneTaskType, context }],
    mutationFn: (configId: string) =>
      runTask({
        ctx: context,
        task_type: obiOneTaskType,
        config_id: configId,
      }),
    onSuccess: (executionId, configId) => {
      log('info', `${logTopic} for ${configId} launched successfully, execution ID`, {
        executionId,
      });
      invalidateScanConfigExecutionActivities({ queryClient, context, executionActivityType });
    },
    onError: (error, configId) => {
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
    queryFn: () =>
      getTaskActivities({
        filters: {
          task_activity_type: configGenerationActivityType,
          used__id: campaignId,
        },
        withFacets: false,
        context,
      }),
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
    queryFn: () =>
      getTaskConfigs<TMeta>({
        filters: {
          task_config_type: taskConfigType,
          id__in: configGenerationIds,
        },
        withFacets: false,
        context,
      }),
    enabled: Boolean(configGenerationIds && configGenerationIds.length > 0),
    select: (data) => {
      const configs = data.data;
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      const configList = [...(configs ?? [])].sort((a, b) => collator.compare(a.name, b.name));
      const configIds = configList.map((c) => c.id);
      return { configList, configIds } satisfies TScanConfigTaskRunnerConfigs<TMeta>;
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
    queryFn: () =>
      getTaskActivities({
        filters: {
          task_activity_type: executionActivityType,
          used__id__in: configsResponse?.configIds ?? [],
        },
        context,
      }),
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
