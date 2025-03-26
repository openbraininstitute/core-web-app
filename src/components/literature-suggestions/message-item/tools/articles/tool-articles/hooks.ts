import React from 'react';
import { UIMessage } from '@ai-sdk/ui-utils';
import { extractTool, uniquify } from '../../common';
import { isLiteratureSearchToolResult, isWebSearchToolResult, ScientificArticle } from './types';

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

    for (const item of output) {
      const article: ScientificArticle = {
        title: item.article_title,
        abstract: item.abstract,
        authors: item.article_authors,
        url: `https://doi.org/${item.article_doi}`,
      };
      articles.push(article);
    }
  }
}

function extractFromWebSearch(message: UIMessage, articles: ScientificArticle[]) {
  const invocations = extractTool(message, 'web-search-tool');
  for (const { output } of invocations) {
    if (!isWebSearchToolResult(output)) continue;

    for (const item of output.results) {
      const article: ScientificArticle = {
        title: item.title,
        abstract: item.content,
        authors: [],
        url: item.url,
      };
      articles.push(article);
    }
  }
}
