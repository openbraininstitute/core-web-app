import React from 'react';

import { styleBlockSmall } from '../../styles';
import { useSanityContentForMultipleMember } from './hooks';
import Member from './member';
import { classNames } from '@/util/utils';

import styles from './multiple-member.module.css';

export interface WidgetMultipleMemberProps {
  className?: string;
}

export default function WidgetMultipleMember({ className }: WidgetMultipleMemberProps) {
  const members = useSanityContentForMultipleMember();

  return (
    <div className={classNames(className, styles.multipleMember, styleBlockSmall)}>
      {members.map((member) => (
        <Member key={`${member.firstName}|${member.lastName}`} value={member} />
      ))}
    </div>
  );
}
