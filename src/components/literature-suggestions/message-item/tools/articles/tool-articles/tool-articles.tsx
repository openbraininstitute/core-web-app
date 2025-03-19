import React from 'react';
import { UIMessage } from '@ai-sdk/ui-utils';

import ArticleCard from '../article-card';
import Expand from '../../expand';
import { useArticles } from './hooks';

export interface ToolArticlesProps {
  className?: string;
  message: UIMessage;
}

export default function ToolArticles({ className, message }: ToolArticlesProps) {
  const articles = useArticles(message);

  if (articles.length === 0) return null;

  return (
    <Expand
      className={className}
      title={
        <>
          Show all articles (<strong>{articles.length}</strong>)
        </>
      }
    >
      {articles.map((item) => (
        <ArticleCard key={item.title} article={item} />
      ))}
    </Expand>
  );
}
