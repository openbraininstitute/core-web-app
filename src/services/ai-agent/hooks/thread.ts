'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';
import { sharedSessionStorage } from '@/util/shared-session-storage';
import {
  serviceAiAgentThreadCreate,
  serviceAiAgentThreadDelete,
  serviceAiAgentThreadExists,
  serviceAiAgentThreadList,
  serviceAiAgentThreadMessages,
  serviceAiAgentThreadRename,
} from '../api';
import type { AssistantContext } from '../assistant/types';

export function useThreadInit(context: AssistantContext) {
  const { accessToken, virtualLabId, projectId } = context;

  return useQuery({
    queryKey: keyBuilderAI.threadInit(accessToken, virtualLabId, projectId),
    queryFn: async () => {
      console.log('[useThreadInit] Starting thread initialization...');
      const sessionThreadId = sharedSessionStorage.getItem('AI-Assistant/threadId') ?? '';

      if (sessionThreadId) {
        console.log('[useThreadInit] Found session thread:', sessionThreadId);
        const exists = await serviceAiAgentThreadExists({ accessToken, threadId: sessionThreadId });
        if (exists) {
          console.log('[useThreadInit] Session thread exists, using it');
          return sessionThreadId;
        }
        console.log('[useThreadInit] Session thread does not exist');
      }

      console.log('[useThreadInit] Creating new thread...');
      const thread = await serviceAiAgentThreadCreate({
        accessToken,
        virtualLabId,
        projectId,
        title: new Date().toUTCString(),
      });

      console.log('[useThreadInit] Thread created:', thread.threadId);
      sharedSessionStorage.setItem('AI-Assistant/threadId', thread.threadId);
      return thread.threadId;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: accessToken !== 'NO-TOKEN',
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useThreadMessages(threadId: string, context: AssistantContext) {
  const { accessToken, virtualLabId, projectId } = context;

  return useQuery({
    queryKey: keyBuilderAI.messages(threadId),
    queryFn: async () => {
      console.log('[useThreadMessages] Fetching messages for thread:', threadId);
      const resp = await serviceAiAgentThreadMessages({
        accessToken,
        virtualLabId,
        projectId,
        threadId,
      });
      console.log('[useThreadMessages] Fetched', resp.results.length, 'messages');
      return resp.results.reverse();
    },
    enabled: !!threadId && accessToken !== 'NO-TOKEN',
    staleTime: 0,
  });
}

export function useThreadHistory(context: AssistantContext, cursor: string | null = null) {
  const { accessToken, virtualLabId, projectId } = context;

  return useQuery({
    queryKey: [...keyBuilderAI.history(virtualLabId, projectId), cursor],
    queryFn: async () => {
      return await serviceAiAgentThreadList({
        accessToken,
        projectId,
        virtualLabId,
        cursor,
        pageSize: 10,
        excludeEmptyThreads: true,
      });
    },
    enabled: accessToken !== 'NO-TOKEN',
    staleTime: 30000,
  });
}

export function useCreateThread(context: AssistantContext) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const thread = await serviceAiAgentThreadCreate({
        ...context,
        title: new Date().toUTCString(),
      });
      sharedSessionStorage.setItem('AI-Assistant/threadId', thread.threadId);
      return thread.threadId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyBuilderAI.history(context.virtualLabId, context.projectId),
      });
    },
  });
}

export function useRenameThread(context: AssistantContext) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, title }: { threadId: string; title: string }) => {
      await serviceAiAgentThreadRename({
        ...context,
        threadId,
        title,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyBuilderAI.history(context.virtualLabId, context.projectId),
      });
    },
  });
}

export function useDeleteThread(context: AssistantContext) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      await serviceAiAgentThreadDelete({
        ...context,
        threadId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyBuilderAI.history(context.virtualLabId, context.projectId),
      });
    },
  });
}
