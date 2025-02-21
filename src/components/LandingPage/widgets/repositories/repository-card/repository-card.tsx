import React from 'react';

import { ContentForRepository } from '../hooks';
import { classNames } from '@/util/utils';
import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';
import { IconEye } from '@/components/LandingPage/icons/IconEye';
import { styleButtonHoverable } from '@/components/LandingPage/styles';
import styles from './repository-card.module.css';

export interface RepositoryCardProps {
  className?: string;
  value: ContentForRepository;
  showHeader?: boolean;
}

export default function RepositoryCard({ className, value, showHeader }: RepositoryCardProps) {
  return (
    <div className={classNames(className, styles.repositoryCard)}>
      <h2>{value.title}</h2>
      {showHeader && (
        <header>
          <div className={styles.authorLabel}>Type</div>
          <div className={styles.authorName}>{value.type}</div>
        </header>
      )}
      <ProgressiveImage
        className={styles.image}
        src={value.imageURL}
        width={value.imageWidth}
        height={value.imageHeight}
      />
      <p>{value.description}</p>
      <div className={styles.buttons}>
        {value.buttons.map((btn) => (
          <a
            className={classNames(styles.button, styleButtonHoverable)}
            href={btn.link}
            target="_blank"
            key={btn.title}
          >
            <div>{btn.title ?? 'View resource'}</div>
            <IconEye />
          </a>
        ))}
      </div>
    </div>
  );
}
