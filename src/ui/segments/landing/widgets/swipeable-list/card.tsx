import React from 'react';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { classNames } from '@/util/utils';

import type { ContentForSwipeableListItem } from '@/services/sanity/api/get-swipeable-list';

import styles from './card.module.css';

interface NewsCardProps {
  className?: string;
  value: ContentForSwipeableListItem;
}

export default function Card({ className, value }: NewsCardProps) {
  return (
    <div className={classNames(className, styles.swipeableCard)}>
      <div className={styles.content}>
        <div>
          <div>{value.subtitle}</div>
          <h2>{value.title}</h2>
        </div>
        <p>{value.text}</p>
      </div>
      <div className={styles.picture}>
        <ProgressiveImage
          src={value.imageURL}
          alt={value.title}
          width={value.imageWidth}
          height={value.imageHeight}
        />
      </div>
    </div>
  );
}
