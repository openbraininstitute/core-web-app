'use client';

import React from 'react';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { Text } from '@/ui/segments/landing/components/text/text';
import { styleButtonHoverable } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type { ContentForMultipleMemberItem } from '@/services/sanity/api/get-multiple-member';

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
