import React from 'react';

import { serviceAiAgentSuggestionFromUserJourney } from '../api/suggestion';
import { useAccessToken } from '@/hooks/useAccessToken';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { useGenericEventListener } from '@/util/generic-event';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';

export function useServiceAiAgentSuggestionFromUserJourney(
  threadId: string,
  count: number
): [suggestions: string[], clearSuggestions: () => void] {
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const accessToken = useAccessToken();
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const fetchSuggestions = React.useCallback(() => {
    const action = async () => {
      try {
        const data = await serviceAiAgentSuggestionFromUserJourney(
          accessToken ?? 'no-access-token',
          {
            threadId,
            virtualLabId,
            projectId,
          }
        );
        setSuggestions(data.slice(0, count));
      } catch (ex) {
        setSuggestions([]);
      }
    };
    action();
  }, [threadId, count, accessToken, projectId, virtualLabId]);

  React.useEffect(fetchSuggestions, [fetchSuggestions]);
  useGenericEventListener(userJourneyTracker.eventChange, fetchSuggestions);
  return [suggestions, () => setSuggestions([])];
}
