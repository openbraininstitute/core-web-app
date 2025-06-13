import React from 'react';
import Link from 'next/link';

import { useAITools } from '../../tools';
import { ScientificArticle } from '../tool-articles/types';
import { classNames } from '@/util/utils';

import styles from './article-card.module.css';

export interface ArticleCardProps {
  className?: string;
  article: ScientificArticle;
}

export default function ArticleCard({ className, article }: ArticleCardProps) {
  const tools = useAITools();
  if (!tools) return null;

  const tool = tools.find((item) => item.id === article.tool);
  const Icon = tool?.icon;

  return (
    <Link className={classNames(className, styles.articleCard)} href={article.url} target="_BLANK">
      <h2>
        <div>{article.title}</div>
        {Icon && <Icon />}
      </h2>
      <p>{article.abstract}</p>
    </Link>
  );
}
