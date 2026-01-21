'use client';

import { useQuery } from '@tanstack/react-query';
import { serviceAiAgentUrl } from '../api';
import { isType } from '@/util/type-guards';

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
    console.error('[Rate Limit API] Data is not an object:', data);
    return false;
  }

  const obj = data as Record<string, unknown>;
  
  if (!obj.chat_streamed || typeof obj.chat_streamed !== 'object' || obj.chat_streamed === null) {
    console.error('[Rate Limit API] Missing or invalid chat_streamed');
    return false;
  }

  const chatStreamed = obj.chat_streamed as Record<string, unknown>;
  
  const isValid = 
    typeof chatStreamed.limit === 'number' &&
    typeof chatStreamed.remaining === 'number' &&
    (typeof chatStreamed.reset_in === 'number' || chatStreamed.reset_in === null);

  if (!isValid) {
    console.error('[Rate Limit API] chat_streamed validation failed:', {
      limit: typeof chatStreamed.limit,
      remaining: typeof chatStreamed.remaining,
      reset_in: typeof chatStreamed.reset_in,
      reset_in_value: chatStreamed.reset_in,
    });
  }
  
  return isValid;
}

export function useAiAgentRateLimit(accessToken: string | null) {
  return useQuery({
    queryKey: ['ai-agent-rate-limit', accessToken],
    queryFn: async () => {
      const url = serviceAiAgentUrl(['rate_limit']);
      console.log('[Rate Limit API] Fetching from:', url);
      console.log('[Rate Limit API] Access token:', accessToken ? 'present' : 'missing');
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('[Rate Limit API] Response status:', response.status);

      if (!response.ok) {
        console.error('[Rate Limit API] Failed with status:', response.status);
        throw new Error(`Failed to fetch rate limit: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Rate Limit API] Response data:', data);
      
      if (!isAiAgentRateLimitResponse(data)) {
        console.error('[Rate Limit API] Invalid response format:', data);
        throw new Error('Invalid rate limit response');
      }

      console.log('[Rate Limit API] ✅ Successfully fetched rate limit');
      return data;
    },
    enabled: !!accessToken,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: false, // Don't retry on failure for easier debugging
  });
}
