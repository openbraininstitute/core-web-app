import React from 'react';
import Image from 'next/image';

import { classNames } from '@/util/utils';
import { ContentForNewsItem } from '@/components/LandingPage/content';

import styles from './NewsCard.module.css';

export interface NewsCardProps {
  className?: string;
  value: ContentForNewsItem;
}

export default function NewsCard({ className, value }: NewsCardProps) {
  return (
    <div className={classNames(className, styles.newsCard)}>
      <div className={styles.content}>
        <h2>{value.title}</h2>
        <small>Published {formatDate(value.date)}</small>
        <p>{value.content}</p>
      </div>
      <div className={styles.picture}>
        <Image
          src={value.imageURL}
          alt={value.title}
          width={value.imageWidth}
          height={value.imageHeight}
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
