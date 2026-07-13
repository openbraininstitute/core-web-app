'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { ApiError } from '@/api/error';
import { runTask } from '@/api/one/runner';
import { useAppNotification } from '@/components/notification';
import { useRunWithOfflineTokenConsent } from '@/features/offline-auth-management';
import { errorRegistry } from '@/features/scan-config/error-registry';
import { getErrorMessage } from '@/utils/error';
import { log } from '@/utils/logger';

import { TASK_ACTIVITIES_QUERY_KEY_HEAD, TASK_RUNNER_QUERY_KEY_HEAD } from '../constants';
import { invalidateProjectBalance } from './use-balance-refresh';

import type { QueryClient } from '@tanstack/react-query';
import type { TTaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import type { TObiOneTaskType } from '@/api/one/types/task';
import type { WorkspaceContext } from '@/types/common';

export function invalidateTaskExecutionActivities({
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

export type TTaskLaunchMutationOptions = {
  context: WorkspaceContext;
  obiOneTaskType: TObiOneTaskType;
  executionActivityType: TTaskActivityType;
  notificationKey: string;
  failureMessage: string;
  logTopic: string;
  requiresConsent?: boolean;
};

export function useTaskLaunchMutation({
  context,
  obiOneTaskType,
  executionActivityType,
  notificationKey,
  failureMessage,
  logTopic,
  requiresConsent = false,
}: TTaskLaunchMutationOptions) {
  const queryClient = useQueryClient();
  const notification = useAppNotification();
  const { runWithConsent } = useRunWithOfflineTokenConsent();
  const logTopicLower = logTopic.toLowerCase();

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
    mutationKey: [TASK_RUNNER_QUERY_KEY_HEAD, { obiOneTaskType, context, requiresConsent }],
    mutationFn: async (configIdsOrId: string[] | string) => {
      const configIds = Array.isArray(configIdsOrId) ? configIdsOrId : [configIdsOrId];

      const runLaunches = async () => {
        let launched = false;
        for (const configId of configIds) {
          try {
            const executionId = await runTask({
              ctx: context,
              task_type: obiOneTaskType,
              config_id: configId,
            });
            launched = true;
            log('info', `${logTopic} for ${configId} launched successfully, execution ID`, {
              executionId,
            });
          } catch (error) {
            handleTaskError(error, configId);
          }
        }

        await Promise.all([
          invalidateTaskExecutionActivities({
            queryClient,
            context,
            executionActivityType,
          }),
          // Launching reserves credits, so also refetch the balance — unless nothing launched.
          launched ? invalidateProjectBalance({ queryClient, context }) : undefined,
        ]);
      };

      if (requiresConsent) {
        return runWithConsent({ fn: runLaunches });
      }

      return runLaunches();
    },
  });
}
