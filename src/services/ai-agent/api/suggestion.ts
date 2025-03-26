import { fetchJSON } from './util';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { isType } from '@/util/type-guards';

export async function serviceAiAgentSuggestionFromUserJourney(
  accessToken: string,
  options?: {
    virtualLabId?: string | null;
    projectId?: string | null;
  }
): Promise<string[]> {
  const { virtualLabId = null, projectId = null } = options ?? {};
  const journey = await userJourneyTracker.getLastTuples();
  const data = await fetchJSON({
    accessToken,
    path: 'qa/question_suggestions',
    params: {
      vlab_id: virtualLabId,
      project_id: projectId,
    },
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
