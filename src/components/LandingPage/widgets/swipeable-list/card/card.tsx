import React from 'react';

import { ContentForSwipeableListItem } from '../hooks';
import { classNames } from '@/util/utils';
import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';

import styles from './card.module.css';

export interface NewsCardProps {
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
