'use client';

import React from 'react';

import { serviceAiAgentSuggestionFromUserJourney } from '../api/suggestion';
import { useAccessToken } from '@/hooks/useAccessToken';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { useGenericEventListener } from '@/util/generic-event';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';
import { useSnapshot } from '@/components/ai-assistant/suggested-questions/snapshot';

export function useServiceAiAgentSuggestionFromUserJourney(
  threadId: string
): [suggestions: string[], clearSuggestions: () => void, isLoading: boolean] {
  const snapshot = useSnapshot();
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const accessToken = useAccessToken();
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const snapshotRef = React.useRef(snapshot);
  snapshotRef.current = snapshot;

  const fetchSuggestions = React.useCallback(
    (url?: string) => {
      const action = async () => {
        setIsLoading(true);
        try {
          const data = await serviceAiAgentSuggestionFromUserJourney(
            accessToken ?? 'no-access-token',
            {
              threadId,
              virtualLabId,
              projectId,
              frontendUrl: url ?? snapshotRef.current.frontendUrl,
            }
          );
          setSuggestions(data);
        } catch {
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      };
      action();
    },
    [threadId, accessToken, projectId, virtualLabId]
  );

  const prevUrlRef = React.useRef(snapshot.frontendUrl);

  React.useEffect(() => {
    if (prevUrlRef.current !== snapshot.frontendUrl) {
      fetchSuggestions(snapshot.frontendUrl);
      prevUrlRef.current = snapshot.frontendUrl;
    }
  }, [snapshot.frontendUrl, fetchSuggestions]);

  React.useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);
  return [suggestions, () => setSuggestions([]), isLoading];
}
