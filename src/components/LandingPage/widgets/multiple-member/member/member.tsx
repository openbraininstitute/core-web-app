import React from 'react';

import { ContentForMultipleMemberItem } from '../hooks';
import { Text } from '@/components/LandingPage/components/Text';
import { classNames } from '@/util/utils';
import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';

import styles from './member.module.css';

export interface MemberProps {
  className?: string;
  value: ContentForMultipleMemberItem;
}

export default function Member({ className, value }: MemberProps) {
  return (
    <div className={classNames(className, styles.member)}>
      <ProgressiveImage
        className={styles.picture}
        src={value.imageURL}
        width={value.imageWidth}
        height={value.imageHeight}
      />
      <div className={styles.content}>
        <h2>
          {value.firstName} {value.lastName}
        </h2>
        <Text value={value.biography} />
      </div>
    </div>
  );
}
