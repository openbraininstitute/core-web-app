import React from 'react';

import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';
import { Text } from '@/components/LandingPage/components/Text';
import { styleButtonHoverable } from '@/components/LandingPage/styles';
import { classNames } from '@/util/utils';

import type { ContentForMultipleMemberItem } from '../hooks';

import styles from './member.module.css';

interface MemberProps {
  className?: string;
  value: ContentForMultipleMemberItem;
}

export default function Member({ className, value }: MemberProps) {
  const [maxLines, setMaxLines] = React.useState(2);
  const toggleTextOverflow = () => {
    setMaxLines(maxLines > 0 ? 0 : 2);
  };

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
        <Text value={value.biography} maxLines={maxLines} />
        <button type="button" className={styleButtonHoverable} onClick={toggleTextOverflow}>
          Read {maxLines > 0 ? 'more' : 'less'}
        </button>
      </div>
    </div>
  );
}
