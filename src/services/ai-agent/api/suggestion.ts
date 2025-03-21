import { fetchJSON } from './util';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { isType } from '@/util/type-guards';

export async function serviceAiAgentSuggestionFromUserJourney(
  accessToken: string
): Promise<string[]> {
  const journey = await userJourneyTracker.getLastTuples();
  const data = await fetchJSON({
    accessToken,
    path: 'qa/question_suggestions',
    query: {
      click_history: journey,
    },
    typeGuard: isSuggestionFromUserJourneyResponse,
  });
  return data.suggestions.map((suggestion) => suggestion.question);
}

interface SuggestionFromUserJourneyResponse {
  suggestions: Array<{
    question: string;
  }>;
}

export function isSuggestionFromUserJourneyResponse(
  data: unknown
): data is SuggestionFromUserJourneyResponse {
  return isType(data, {
    suggestions: ['array', { question: 'string' }],
  });
}
