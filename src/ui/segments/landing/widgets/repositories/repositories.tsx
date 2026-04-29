import { styleBlockFullWidthPadded } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import RepositoryCard from './repository-card';

import type { ContentForRepository } from '@/services/sanity/api/get-repositories-content';

import styles from './repositories.module.css';

interface WidgetRepositoriesProps {
  className?: string;
  data: ContentForRepository[];
}

export default function WidgetRepositories({ className, data }: WidgetRepositoriesProps) {
  return (
    <div className={classNames(className, styles.repositories, styleBlockFullWidthPadded)}>
      {data.map((repo) => (
        <RepositoryCard key={repo.url} value={repo} />
      ))}
    </div>
  );
}
