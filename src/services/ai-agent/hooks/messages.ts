'use client';

import { useQuery } from '@tanstack/react-query';
import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';
import { serviceAiAgentThreadMessages } from '../api';
import type { AssistantContext } from '../assistant/types';

export function useThreadMessages(context: AssistantContext, threadId: string | undefined) {
  const { accessToken, virtualLabId, projectId } = context;

  return useQuery({
    queryKey: keyBuilderAI.messages(threadId ?? '', virtualLabId, projectId),
    queryFn: async () => {
      if (!threadId) return { results: [] };
      const resp = await serviceAiAgentThreadMessages({
        accessToken,
        virtualLabId,
        projectId,
        threadId,
      });
      return { results: resp.results.reverse() };
    },
    enabled: !!threadId && accessToken !== 'NO-TOKEN',
    staleTime: 30000,
  });
}
