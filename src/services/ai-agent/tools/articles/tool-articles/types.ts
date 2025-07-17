import { logError, logInfo } from '@/util/logger';
import { assertType, TypeDef } from '@/util/type-guards';

export interface ScientificArticle {
  title: string;
  abstract: string;
  authors: string[];
  url: string;
  tool: string;
}

interface LiteratureSearchToolItem {
  article_title: string;
  article_doi: string;
  article_authors: string[];
  abstract: string | null;
}

interface LiteratureSearchToolResult {
  articles: LiteratureSearchToolItem[];
  error: unknown;
}

export function isLiteratureSearchToolResult(data: unknown): data is LiteratureSearchToolResult {
  try {
    const typeStringOrNull: TypeDef = ['|', 'string', 'null'];
    assertType(data, {
      articles: [
        'array',
        {
          article_title: 'string',
          article_doi: typeStringOrNull,
          article_authors: ['array', 'string'],
          abstract: typeStringOrNull,
        },
      ],
      error: 'unknown',
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
