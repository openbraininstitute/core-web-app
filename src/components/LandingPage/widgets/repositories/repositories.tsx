import { classNames } from '@/util/utils';
import { styleBlockFullWidthPadded } from '../../styles';
import { useSanityContentForRepositories } from './hooks';
import styles from './repositories.module.css';
import RepositoryCard from './repository-card';

interface WidgetRepositoriesProps {
  className?: string;
}

export default function WidgetRepositories({ className }: WidgetRepositoriesProps) {
  const repositories = useSanityContentForRepositories();

  return (
    <div className={classNames(className, styles.repositories, styleBlockFullWidthPadded)}>
      {repositories.map((repo) => (
        <RepositoryCard key={repo.url} value={repo} />
      ))}
    </div>
  );
}
