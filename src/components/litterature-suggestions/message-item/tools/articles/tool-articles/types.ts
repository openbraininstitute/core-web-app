import { isType } from '@/util/type-guards';

export interface ScientificArticle {
  title: string;
  abstract: string;
  authors: string[];
  url: string;
}

export interface LiteratureSearchToolItem {
  article_title: string;
  article_doi: string;
  article_authors: string[];
  abstract: string;
  paragraph: string;
}

export function isLiteratureSearchToolResult(data: unknown): data is LiteratureSearchToolItem[] {
  return isType(data, [
    'array',
    {
      article_title: 'string',
      article_doi: 'string',
      article_authors: ['array', 'string'],
      abstract: 'string',
      paragraph: 'string',
    },
  ]);
}

export interface WebSearchToolItem {
  title: string;
  content: string;
  url: string;
  score: number;
}

export interface WebSearchToolResult {
  results: WebSearchToolItem[];
}

export function isWebSearchToolResult(data: unknown): data is WebSearchToolResult {
  return isType(data, {
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
}
