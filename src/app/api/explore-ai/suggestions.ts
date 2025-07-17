import { captureException } from '@sentry/nextjs';
import { postJSON } from './common';
import {
  type ExploreAiSuggestionsQuery,
  isExploreAiSuggestionsResponse,
} from './types/suggestions';

export async function serviceExploreAiGetSuggestions(
  accessToken: string,
  query: ExploreAiSuggestionsQuery
) {
  try {
    const data = await postJSON(
      'qa/question_suggestions',
      accessToken,
      {
        click_history: query.history,
      },
      isExploreAiSuggestionsResponse
    );
    return Response.json(data);
  } catch (error) {
    captureException(error);
    return new Response('ServerError: Fetch AI backend failed', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
