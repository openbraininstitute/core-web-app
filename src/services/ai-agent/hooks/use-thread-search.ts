import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { useAccessToken } from '@/hooks/useAccessToken';
import { serviceAiAgentThreadSearch } from '@/services/ai-agent/api';
import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';

import type { ThreadSearchResponse } from '@/services/ai-agent/api/thread';

export function useThreadSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const accessToken = useAccessToken();
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery<ThreadSearchResponse | null>({
    queryKey: keyBuilderAI.search(debouncedQuery, virtualLabId, projectId),
    queryFn: async () => {
      if (!debouncedQuery.trim() || !accessToken) return null;
      return await serviceAiAgentThreadSearch({
        accessToken,
        query: debouncedQuery,
        virtualLabId,
        projectId,
      });
    },
    enabled: !!debouncedQuery.trim() && !!accessToken,
    staleTime: 30000,
  });

  return {
    results: data,
    isLoading: isLoading && !!debouncedQuery,
    hasQuery: !!debouncedQuery,
  };
}
