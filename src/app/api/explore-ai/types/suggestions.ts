import { assertType } from '@/util/type-guards';

export interface ExploreAiSuggestionsQuery {
  type: 'suggestions';
  history: [type: string, value: string][][];
}

export function isExploreAiSuggestionsQuery(data: unknown): data is ExploreAiSuggestionsQuery {
  try {
    assertType(data, {
      type: ['literal', 'suggestions'],
      history: ['array', ['array', ['array', 'string', { min: 2, max: 2 }]]],
    });
    return true;
  } catch {
    return false;
  }
}

interface ExploreAiSuggestionsResponse {
  suggestions: Array<{
    question: string;
  }>;
}

export function isExploreAiSuggestionsResponse(
  data: unknown
): data is ExploreAiSuggestionsResponse {
  try {
    assertType(data, {
      suggestions: [
        'array',
        {
          question: 'string',
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}
