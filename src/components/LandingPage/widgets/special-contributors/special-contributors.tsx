import { classNames } from '@/util/utils';
import { styleBlockFullWidthPadded } from '../../styles';
import Card from './card';
import { useSanityContentForSpecialContributors } from './hooks';

import styles from './special-contributors.module.css';

interface SpecialContributorsProps {
  className?: string;
}

export default function WidgetSpecialContributors({ className }: SpecialContributorsProps) {
  const contributors = useSanityContentForSpecialContributors();

  return (
    <div className={classNames(className, styles.specialContributors, styleBlockFullWidthPadded)}>
      {contributors.map((contrib) => (
        <div key={`${contrib.firstName}||${contrib.lastName}`}>
          <Card key={`${contrib.firstName}||${contrib.lastName}`} contributor={contrib} />
        </div>
      ))}
    </div>
  );
}
