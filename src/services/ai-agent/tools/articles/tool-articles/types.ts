import { logError, logInfo } from '@/util/logger';
import { assertType } from '@/util/type-guards';

export interface ScientificArticle {
  title: string;
  abstract: string;
  authors: string[];
  url: string;
  tool: string;
}

interface LiteratureSearchToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError: boolean;
}

export function isLiteratureSearchToolResult(data: unknown): data is LiteratureSearchToolResult {
  try {
    assertType(data, {
      isError: 'boolean',
      content: [
        'array',
        {
          text: 'string',
          type: 'string',
        },
      ],
    });
    return true;
  } catch (ex) {
    logError(
      'Result of literature-search-tool has not the expected format:',
      extractErrorMessage(ex)
    );
    logInfo('We received this:', data);
    return false;
  }
}

interface WebSearchToolItem {
  title: string;
  content: string;
  url: string;
  score: number;
}

interface WebSearchToolResult {
  results: WebSearchToolItem[];
}

export function isWebSearchToolResult(data: unknown): data is WebSearchToolResult {
  try {
    assertType(data, {
      results: [
        'array',
        {
          title: 'string',
          content: 'string',
          url: 'string',
          score: 'number',
        },
      ],
    });
    return true;
  } catch (ex) {
    logError('Result of web-search-tool has not the expected format:', extractErrorMessage(ex));
    logInfo('We received this:', data);
    return false;
  }
}

function extractErrorMessage(ex: unknown) {
  if (typeof ex === 'string') return ex;
  if (ex instanceof Error) return ex.message;
  return JSON.stringify(ex);
}
