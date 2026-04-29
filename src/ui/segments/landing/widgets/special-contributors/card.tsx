import React from 'react';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { styleButtonHoverable } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type { ContentForSpecialContributor } from './hooks';

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
            target="_BLANK"
            href={`https://scholar.google.com/citations?user=${contributor.googleScholar}`}
          >
            Google Scholar
          </a>
        )}
        {contributor.orcid && (
          <a
            className={styleButtonHoverable}
            target="_BLANK"
            href={`https://orcid.org/${contributor.orcid}`}
          >
            Orcid
          </a>
        )}
      </div>
    </div>
  );
}
