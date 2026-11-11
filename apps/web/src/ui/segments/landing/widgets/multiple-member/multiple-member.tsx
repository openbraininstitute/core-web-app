import { styleBlockSmall } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import Member from './member';

import type { ContentForMultipleMemberItem } from '@/services/sanity/api/get-multiple-member';

import styles from './multiple-member.module.css';

interface WidgetMultipleMemberProps {
  className?: string;
  data: ContentForMultipleMemberItem[];
}

export default function WidgetMultipleMember({ className, data }: WidgetMultipleMemberProps) {
  return (
    <div className={classNames(className, styles.multipleMember, styleBlockSmall)}>
      {data.map((member) => (
        <Member key={`${member.firstName}|${member.lastName}`} value={member} />
      ))}
    </div>
  );
}
