import { styleBlockFullWidthPadded } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import Card from './card';

import type { ContentForSpecialContributor } from '@/services/sanity/api/get-special-contributors';

import styles from './special-contributors.module.css';

interface SpecialContributorsProps {
  className?: string;
  data: ContentForSpecialContributor[];
}

export default function WidgetSpecialContributors({ className, data }: SpecialContributorsProps) {
  return (
    <div className={classNames(className, styles.specialContributors, styleBlockFullWidthPadded)}>
      {data.map((contrib) => (
        <div key={`${contrib.firstName}||${contrib.lastName}`}>
          <Card key={`${contrib.firstName}||${contrib.lastName}`} contributor={contrib} />
        </div>
      ))}
    </div>
  );
}
