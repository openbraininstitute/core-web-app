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
}

export default function RepositoryCard({ className, value }: RepositoryCardProps) {
  return (
    <div className={classNames(className, styles.repositoryCard)}>
      <h2>{value.title}</h2>
      <header>
        <div className={styles.authorLabel}>Author</div>
        <div className={styles.authorName}>{value.author}</div>
      </header>
      <ProgressiveImage
        className={styles.image}
        src={value.imageURL}
        width={value.imageWidth}
        height={value.imageHeight}
      />
      <p>{value.description}</p>
      <a
        className={classNames(styles.button, styleButtonHoverable)}
        href={value.url}
        target="_blank"
      >
        <div>View Notebook</div>
        <IconEye />
      </a>
    </div>
  );
}
