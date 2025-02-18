import React from 'react';

import { styleBlockLarge } from '../../styles';
import { useSanityContentForRepositories } from './hooks';
import RepositoryCard from './repository-card';
import { classNames } from '@/util/utils';

import styles from './repositories.module.css';

export interface WidgetRepositoriesProps {
  className?: string;
}

export default function WidgetRepositories({ className }: WidgetRepositoriesProps) {
  const repositories = useSanityContentForRepositories();

  return (
    <div className={classNames(className, styles.repositories, styleBlockLarge)}>
      {repositories.map((repo) => (
        <RepositoryCard key={repo.url} value={repo} />
      ))}
    </div>
  );
}
