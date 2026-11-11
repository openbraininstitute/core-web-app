import Link from 'next/link';
import React from 'react';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { classNames } from '@/util/utils';

import type { ContentForNewsItem } from '@/services/sanity/api/get-news-item';

import styles from './news-card.module.css';

interface NewsCardProps {
  className?: string;
  value: ContentForNewsItem;
}

export default function NewsCard({ className, value }: NewsCardProps) {
  return (
    <Link
      href={value.link ?? `/news/${value.id}`}
      target={value.link ? '_blank' : undefined}
      rel={value.link ? 'noopener noreferrer' : undefined}
      className={classNames(className, styles.newsCard)}
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
    </Link>
  );
}

function formatDate(d: string) {
  const date = new Date(d);
  const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'long' });
  return fmt.format(date);
}
