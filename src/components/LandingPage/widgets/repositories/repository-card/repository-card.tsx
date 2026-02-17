'use client';

import { useState } from 'react';

import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';
import { IconEye } from '@/components/LandingPage/icons/IconEye';
import { styleButtonHoverable } from '@/components/LandingPage/styles';
import { classNames } from '@/util/utils';

import type { ContentForRepository } from '../hooks';

import styles from './repository-card.module.css';

interface RepositoryCardProps {
  className?: string;
  value: ContentForRepository;
  showHeader?: boolean;
}

export default function RepositoryCard({ className, value, showHeader }: RepositoryCardProps) {
  const [textExpanded, setTextExpanded] = useState<boolean>(false);

  const textContent = textExpanded ? value.description : `${value.description.slice(0, 200)}...`;

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
      <div>
        <p>{textContent}</p>
        <button
          type="button"
          aria-label="Read more"
          className={styles.readMore}
          onClick={() => setTextExpanded(!textExpanded)}
        >
          {textExpanded ? 'Read less' : 'Read more'}
        </button>
      </div>
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
