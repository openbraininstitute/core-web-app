import React from 'react';

import { serviceAiAgentSuggestionFromUserJourney } from '../api/suggestion';
import { useAccessToken } from '@/hooks/useAccessToken';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { useGenericEventListener } from '@/util/generic-event';

export function useServiceAiAgentSuggestionFromUserJourney(): [
  suggestions: string[],
  clearSuggestions: () => void,
] {
  const accessToken = useAccessToken();
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const fetchSuggestions = React.useCallback(() => {
    const action = async () => {
      try {
        const data = await serviceAiAgentSuggestionFromUserJourney(
          accessToken ?? 'no-access-token'
        );
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      }
    };
    action();
  }, [accessToken]);
  React.useEffect(fetchSuggestions, [fetchSuggestions]);
  useGenericEventListener(userJourneyTracker.eventChange, fetchSuggestions);
  return [suggestions, () => setSuggestions([])];
}
