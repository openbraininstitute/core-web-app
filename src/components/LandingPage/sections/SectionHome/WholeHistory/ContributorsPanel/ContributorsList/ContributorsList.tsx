import React from 'react';

import { Contributor } from '../data';
import { classNames } from '@/util/utils';

import styles from './ContributorsList.module.css';

export interface ContributorsListProps {
  className?: string;
  list: Contributor[];
}

export default function ContributorsList({ className, list }: ContributorsListProps) {
  return (
    <div className={classNames(className, styles.contributorsList)}>
      {list.map((contributor) => (
        <div key={contributor.full_name}>
          <div className={styles.name}>{contributor.full_name}</div>
          <div className={styles.links}>
            {contributor.google_scholar && (
              <a href={`https://scholar.google.com/citations?user=${contributor.google_scholar}`}>
                Google Scholar
              </a>
            )}
            {contributor.ORCID && <a href={`https://orcid.org/${contributor.ORCID}`}>Orcid</a>}
          </div>
        </div>
      ))}
    </div>
  );
}
