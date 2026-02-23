'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceAiAgentUrl } from '../api';

export interface AiAgentRateLimitEndpoint {
  limit: number;
  remaining: number;
  /** Number of seconds before new free credits (null if no reset scheduled) */
  reset_in: number | null;
}

export interface AiAgentRateLimitResponse {
  chat_streamed: AiAgentRateLimitEndpoint;
  question_suggestions: AiAgentRateLimitEndpoint;
  generate_title: AiAgentRateLimitEndpoint;
}

function isAiAgentRateLimitResponse(data: unknown): data is AiAgentRateLimitResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (!obj.chat_streamed || typeof obj.chat_streamed !== 'object' || obj.chat_streamed === null) {
    return false;
  }

  const chatStreamed = obj.chat_streamed as Record<string, unknown>;

  return (
    typeof chatStreamed.limit === 'number' &&
    typeof chatStreamed.remaining === 'number' &&
    (typeof chatStreamed.reset_in === 'number' || chatStreamed.reset_in === null)
  );
}

export function useAiAgentRateLimit(accessToken: string | null) {
  return useQuery({
    queryKey: ['ai-agent-rate-limit', accessToken],
    queryFn: async () => {
      const url = serviceAiAgentUrl(['rate_limit']);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch rate limit: ${response.status}`);
      }

      const data = await response.json();

      if (!isAiAgentRateLimitResponse(data)) {
        throw new Error('Invalid rate limit response');
      }

      return data;
    },
    enabled: !!accessToken,
    staleTime: Infinity, // Only fetch once on mount
    retry: false,
  });
}
