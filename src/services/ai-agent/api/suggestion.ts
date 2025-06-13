import { fetchJSON } from './util';
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

export type AsyncAction<T extends unknown[], R> = (...args: T) => Promise<R>;

/**
 * Transform a async function into a squashable one.
 * That means that if you call it but the previous call is still pending,
 * you will get the still pending promise and not execute it another time.
 * Useful for network calls you don't want to have in parallel.
 */
export function asyncCreateSquash<T extends unknown[], R>(
  action: AsyncAction<T, R>
): AsyncAction<T, R> {
  let currentAction: Promise<R> | null = null;

  return async (...args: T): Promise<R> => {
    if (currentAction) return currentAction;
    currentAction = action(...args);
    const result = await currentAction;
    currentAction = null;
    return result;
  };
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
