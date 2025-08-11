import React from 'react';
import { UIMessage } from '@ai-sdk/ui-utils';

import { extractTool, uniquify } from '../../common';
import { isLiteratureSearchToolResult, ScientificArticle } from './types';
import { logError } from '@/util/logger';
import { assertType } from '@/util/type-guards';

export function useArticles(message: UIMessage) {
  return React.useMemo(() => {
    const articles: ScientificArticle[] = [];
    extractFromLiteratureSearch(message, articles);
    extractFromWebSearch(message, articles);
    return uniquify(articles, (a) => a.url);
  }, [message]);
}

function extractFromLiteratureSearch(message: UIMessage, articles: ScientificArticle[]) {
  const invocations = extractTool(message, 'literature-search-tool');
  for (const { output } of invocations) {
    if (!isLiteratureSearchToolResult(output)) continue;

    for (const item of output.content) {
      const content = parseLiteratureSearchContent(item);
      if (!content) continue;

      for (const result of content.results) {
        const article: ScientificArticle = {
          tool: 'literature-search-tool',
          title: result.title,
          abstract: result.text,
          authors: [result.author],
          url: result.url,
        };
        articles.push(article);
      }
    }
  }
}

function extractFromWebSearch(message: UIMessage, articles: ScientificArticle[]) {
  const invocations = extractTool(message, 'web-search-tool');
  for (const { output } of invocations) {
    if (!isLiteratureSearchToolResult(output)) continue;

    for (const item of output.content) {
      const content = parseLiteratureSearchContent(item);
      if (!content) continue;

      for (const result of content.results) {
        const article: ScientificArticle = {
          tool: 'literature-search-tool',
          title: result.title,
          abstract: result.text,
          authors: [result.author],
          url: result.url,
        };
        articles.push(article);
      }
    }
  }
}

interface LiteratureSearchContent {
  results: Array<{
    id: string;
    author: string;
    title: string;
    url: string;
    text: string;
    publishedDate: string;
  }>;
}

function parseLiteratureSearchContent(item: {
  type: 'text';
  text: string;
}): LiteratureSearchContent {
  if (item.type !== 'text') {
    throw new Error(`Don't know how to deal with type "${item.type}"!`);
  }
  const data = parseJSON(item.text);
  try {
    assertType<LiteratureSearchContent>(data, {
      results: [
        'array',
        {
          id: 'string',
          author: 'string',
          title: 'string',
          url: 'string',
          text: 'string',
          publishedDate: 'string',
        },
      ],
    });
    return data;
  } catch (ex) {
    const error = new Error('Unable to parse literature search content!');
    error.cause = ex;
    throw error;
  }
}

function parseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (ex) {
    logError('Unable to parse JSON content:', text);
    logError(ex);
    throw ex;
  }
}
