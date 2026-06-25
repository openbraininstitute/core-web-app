'use client';

import React from 'react';

import { useSnapshot } from '@/features/ai-assistant/chat/suggested-questions/snapshot';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';

import { serviceAiAgentSuggestionFromUserJourney } from '../api/suggestion';

export function useServiceAiAgentSuggestionFromUserJourney(
  threadId: string,
  status?: 'submitted' | 'streaming' | 'ready' | 'error'
): [suggestions: string[], clearSuggestions: () => void, isLoading: boolean, refetch: () => void] {
  const snapshot = useSnapshot();
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const accessToken = useAccessToken();
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchTrigger, setFetchTrigger] = React.useState(0);

  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (status === 'submitted' || status === 'streaming') {
      setSuggestions([]);
      return;
    }
    if (status === 'ready' && accessToken && virtualLabId && projectId && threadId) {
      const currentRequestId = ++requestIdRef.current;

      setIsLoading(true);
      setSuggestions([]);
      serviceAiAgentSuggestionFromUserJourney(accessToken, {
        threadId,
        virtualLabId,
        projectId,
        frontendUrl: snapshot.frontendUrl,
      })
        .then((data) => {
          if (currentRequestId === requestIdRef.current) {
            setSuggestions(data);
          }
        })
        .catch(() => {
          if (currentRequestId === requestIdRef.current) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (currentRequestId === requestIdRef.current) {
            setIsLoading(false);
          }
        });
    }
  }, [snapshot.frontendUrl, threadId, accessToken, projectId, virtualLabId, status, fetchTrigger]);
  return [suggestions, () => setSuggestions([]), isLoading, () => setFetchTrigger((n) => n + 1)];
}
