import React from 'react';

import CategoryButton from '../CategoryButton';
import { ContentForNewsItem } from '@/components/LandingPage/content';
import { classNames } from '@/util/utils';
import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';
import { IconPlus } from '@/components/LandingPage/icons/IconPlus';
import { styleButtonHoverable } from '@/components/LandingPage/styles';
import { sanitizeURL } from '@/components/LandingPage/utils';
import styles from './Card.module.css';

export interface CardsProps {
  className?: string;
  news: ContentForNewsItem;
}

export default function Cards({ className, news }: CardsProps) {
  return (
    <div className={classNames(className, styles.card, news.isEPFL && styles.small)}>
      <h1>{news.title}</h1>
      <div className={styles.subtitle}>
        <div>Published {formatDate(news.date)}</div>
        <CategoryButton disabled>{news.category}</CategoryButton>
      </div>
      <div className={styles.content}>
        <div className={styles.text}>
          <div>
            <span>{news.content}</span>
          </div>
          <button
            type="button"
            className={classNames(styleButtonHoverable, styles.button)}
            onClick={() => gotoNews(news)}
          >
            <div>Read more</div>
            <IconPlus />
          </button>
        </div>
        <ProgressiveImage
          forceAspectRatio
          className={styles.image}
          src={news.imageURL}
          width={news.imageWidth}
          height={news.imageHeight}
          alt={news.title}
        />
      </div>
    </div>
  );
}

function formatDate(d: string) {
  const date = new Date(d);
  const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'long' });
  return fmt.format(date);
}

function gotoNews(news: ContentForNewsItem): void {
  const url = sanitizeURL(`/welcome/news/${news.slug}`);
  window.location.href = url;
}
