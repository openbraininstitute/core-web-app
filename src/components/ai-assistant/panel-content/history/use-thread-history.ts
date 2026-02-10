'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { serviceAiAgentThreadList } from '@/services/ai-agent/api';
import { useAiAssistant } from '@/services/ai-agent/assistant';
import type {
  AiAssistantHistory,
  AiAssistantHistoryItem,
} from '@/services/ai-agent/assistant/types';
import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';

export function useThreadHistory() {
  const assistant = useAiAssistant();
  const context = assistant.useContext();
  const { accessToken, virtualLabId, projectId } = context;

  const query = useInfiniteQuery({
    queryKey: keyBuilderAI.history(virtualLabId, projectId),
    queryFn: async ({ pageParam }) => {
      return await serviceAiAgentThreadList({
        accessToken,
        projectId,
        virtualLabId,
        cursor: pageParam,
        pageSize: 10,
        excludeEmptyThreads: true,
      });
    },
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
    initialPageParam: null as string | null,
    enabled: accessToken !== 'NO-TOKEN',
    staleTime: 30000,
  });

  const history: AiAssistantHistory =
    query.data?.pages.flatMap((page) =>
      page.results.map(
        (result): AiAssistantHistoryItem => ({
          id: result.thread_id,
          title: result.title,
          date: new Date(result.update_date),
        })
      )
    ) ?? [];

  return {
    history,
    hasMore: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
