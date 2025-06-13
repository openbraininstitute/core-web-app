import React from 'react';
import Image from 'next/image';

import { ContentForTutorialItem } from '../hooks';
import { PlayIcon } from './play-icon';
import { classNames } from '@/util/utils';

import styles from './tutorial-card.module.css';

export interface TutorialCardProps {
  className?: string;
  value: ContentForTutorialItem;
}

export function TutorialCard({ className, value }: TutorialCardProps) {
  const aspectRatio = value.imageWidth / value.imageHeight;
  const imageHeight = 160;

  return (
    <a className={classNames(className, styles.tutorialCard)} target="_blank" href={value.url}>
      <div className={styles.thumbnail}>
        <Image
          alt={value.title}
          width={imageHeight * aspectRatio}
          height={imageHeight}
          src={value.imageURL}
        />
        <PlayIcon />
      </div>
      <h2>{value.title}</h2>
      <p>{value.description}</p>
    </a>
  );
}
