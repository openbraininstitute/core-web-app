import React from 'react';

import { ContentForSpecialContributor } from '../hooks';
import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';
import { styleButtonHoverable } from '@/components/LandingPage/styles';
import { classNames } from '@/util/utils';

import styles from './card.module.css';

interface CardProps {
  className?: string;
  contributor: ContentForSpecialContributor;
}

export default function Card({ className, contributor }: CardProps) {
  const name = `${contributor.firstName} ${contributor.lastName}`;
  return (
    <div className={classNames(className, styles.card)}>
      <ProgressiveImage
        alt={name}
        src={contributor.imageURL}
        width={contributor.imageWidth}
        height={contributor.imageHeight}
      />
      <div className={styles.name}>{name}</div>
      <div className={styles.links}>
        {contributor.googleScholar && (
          <a
            className={styleButtonHoverable}
            target="_blank"
            rel="noreferrer"
            href={`https://scholar.google.com/citations?user=${contributor.googleScholar}`}
          >
            Google Scholar
          </a>
        )}
        {contributor.orcid && (
          <a
            className={styleButtonHoverable}
            target="_blank"
            rel="noreferrer"
            href={`https://orcid.org/${contributor.orcid}`}
          >
            Orcid
          </a>
        )}
      </div>
    </div>
  );
}
