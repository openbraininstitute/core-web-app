import React from 'react';

import { ContentForRichTextVerticalSpace } from '../../../content';
import { styleBlockFullWidth } from '../../../styles';
import { classNames } from '@/util/utils';

import styles from './SanityContentVerticalSpace.module.css';

export interface SanityContentVerticalSpaceProps {
  value: ContentForRichTextVerticalSpace;
}

export default function SanityContentVerticalDivider({ value }: SanityContentVerticalSpaceProps) {
  return (
    <div
      className={classNames(
        styles.sanityContentVerticalSpace,
        styles[value.spacing],
        styleBlockFullWidth
      )}
    />
  );
}
