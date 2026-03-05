'use client';

import React from 'react';

import { useSnapshot } from '@/components/ai-assistant/suggested-questions/snapshot';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';

import { serviceAiAgentSuggestionFromUserJourney } from '../api/suggestion';

export function useServiceAiAgentSuggestionFromUserJourney(
  threadId: string,
  status?: 'submitted' | 'streaming' | 'ready' | 'error'
): [suggestions: string[], clearSuggestions: () => void, isLoading: boolean] {
  const snapshot = useSnapshot();
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const accessToken = useAccessToken();
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (status === 'ready' && accessToken && virtualLabId && projectId && threadId) {
      const currentRequestId = ++requestIdRef.current;

      setIsLoading(true);
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
  }, [snapshot.frontendUrl, threadId, accessToken, projectId, virtualLabId, status]);
  return [suggestions, () => setSuggestions([]), isLoading];
}
