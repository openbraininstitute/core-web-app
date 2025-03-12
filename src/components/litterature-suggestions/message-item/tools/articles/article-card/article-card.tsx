import React from 'react';
import Link from 'next/link';

import { ScientificArticle } from '../tool-articles/types';
import { classNames } from '@/util/utils';

import styles from './article-card.module.css';

export interface ArticleCardProps {
  className?: string;
  article: ScientificArticle;
}

export default function ArticleCard({ className, article }: ArticleCardProps) {
  return (
    <Link className={classNames(className, styles.articleCard)} href={article.url} target="_BLANK">
      <h2>{article.title}</h2>
      <p>{article.abstract}</p>
    </Link>
  );
}
