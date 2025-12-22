import { fetchJSON, asyncCreateSquash } from './util';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { isType } from '@/util/type-guards';

export const serviceAiAgentSuggestionFromUserJourney = asyncCreateSquash(
  async (
    accessToken: string,
    options?: {
      threadId: string;
      virtualLabId?: string | null;
      projectId?: string | null;
    }
  ): Promise<string[]> => {
    const { threadId = null, virtualLabId = null, projectId = null } = options ?? {};
    const journey = userJourneyTracker.value;
    const data = await fetchJSON({
      accessToken,
      path: 'qa/question_suggestions',
      params: {
        vlab_id: virtualLabId,
        project_id: projectId,
      },
      query: {
        thread_id: threadId,
        click_history: journey,
      },
      typeGuard: isSuggestionFromUserJourneyResponse,
    });
    return data.suggestions.map((suggestion) => suggestion.question);
  }
);

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
