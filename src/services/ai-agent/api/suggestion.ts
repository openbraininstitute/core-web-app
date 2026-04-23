import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { isType } from '@/util/type-guards';

import { fetchJSON } from './util';

const pendingRequests = new Map<string, Promise<string[]>>();

export const serviceAiAgentSuggestionFromUserJourney = async (
  accessToken: string,
  options?: {
    threadId: string;
    virtualLabId?: string | null;
    projectId?: string | null;
    frontendUrl: string;
  }
): Promise<string[]> => {
  const key = `${options?.threadId}-${options?.frontendUrl}`;

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const {
    threadId = null,
    virtualLabId = null,
    projectId = null,
    frontendUrl = null,
  } = options ?? {};

  const journey = userJourneyTracker.value;

  // Convert journey objects to strings for the backend (expects string[])
  const clickHistory = journey.map(
    (item) => `${item.region}${item.artifact ? ` > ${item.artifact}` : ''}`
  );

  // Build a full URL for the backend (expects a valid URL, not a relative path)
  const fullFrontendUrl = frontendUrl ? `${globalThis.location?.origin ?? ''}${frontendUrl}` : null;

  const promise = fetchJSON({
    accessToken,
    path: 'qa/question_suggestions',
    query: {
      ...(threadId ? { threadId } : {}),
      ...(clickHistory.length > 0 ? { clickHistory } : {}),
      ...(fullFrontendUrl ? { frontendUrl: fullFrontendUrl } : {}),
    },
    typeGuard: isSuggestionFromUserJourneyResponse,
  })
    .then((data) => data.suggestions.map((suggestion) => suggestion.question))
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, promise);
  return promise;
};

interface SuggestionFromUserJourneyResponse {
  suggestions: Array<{
    question: string;
  }>;
}

function isSuggestionFromUserJourneyResponse(
  data: unknown
): data is SuggestionFromUserJourneyResponse {
  return isType(data, {
    suggestions: ['array', { question: 'string' }],
  });
}
