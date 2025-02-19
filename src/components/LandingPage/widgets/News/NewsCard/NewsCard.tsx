import React from 'react';

import { classNames } from '@/util/utils';
import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';
import { ContentForNewsItem } from '@/components/LandingPage/content';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { getSection, sanitizeURL } from '@/components/LandingPage/utils';

import styles from './NewsCard.module.css';

export interface NewsCardProps {
  className?: string;
  value: ContentForNewsItem;
}

export default function NewsCard({ className, value }: NewsCardProps) {
  return (
    <button
      className={classNames(className, styles.newsCard)}
      type="button"
      onClick={() => gotoNews(value.id)}
    >
      <div className={styles.content}>
        <h2>{value.title}</h2>
        <small>Published {formatDate(value.date)}</small>
        <p>{value.content}</p>
      </div>
      <div className={styles.picture}>
        <ProgressiveImage
          src={value.imageURL}
          alt={value.title}
          width={value.imageWidth}
          height={value.imageHeight}
        />
      </div>
    </button>
  );
}

function formatDate(d: string) {
  const date = new Date(d);
  const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'long' });
  return fmt.format(date);
}

function gotoNews(newsId: string): void {
  const section = getSection(EnumSection.News);
  const url = sanitizeURL(`${section.slug}/${newsId}`);
  window.location.href = url;
}
