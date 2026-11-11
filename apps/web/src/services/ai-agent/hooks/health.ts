'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceAiAgentHealthCheck } from '../api';

export function useAiAgentHealthCheck(accessToken: string | null) {
  const { data, error } = useQuery({
    queryKey: ['ai-agent-health', accessToken],
    queryFn: async () => {
      const healthy = await serviceAiAgentHealthCheck(accessToken!);
      if (!healthy) throw new Error('Health check failed');
      return true;
    },
    enabled: !!accessToken && accessToken !== 'NO-TOKEN',
    retry: 2,
    retryDelay: 1000,
    staleTime: Infinity,
  });

  return {
    isHealthy: data ?? false,
    error: error ? 'Unable to connect to AI assistant service' : null,
  };
}
