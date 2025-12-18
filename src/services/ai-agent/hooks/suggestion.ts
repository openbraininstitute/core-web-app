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

  const fetchSuggestions = React.useCallback(() => {
    const action = async () => {
      setIsLoading(true);
      try {
        const data = await serviceAiAgentSuggestionFromUserJourney(
          accessToken ?? 'no-access-token',
          {
            threadId,
            virtualLabId,
            projectId,
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
  }, [threadId, accessToken, projectId, virtualLabId]);

  React.useEffect(() => {
    userJourneyTracker.registerArtifactClick(snapshot.artifact);
    userJourneyTracker.registerBrainRegionClick(snapshot.regionTitle);
  }, [snapshot]);

  React.useEffect(fetchSuggestions, [fetchSuggestions]);
  useGenericEventListener(userJourneyTracker.eventChange, fetchSuggestions);
  return [suggestions, () => setSuggestions([]), isLoading];
}
