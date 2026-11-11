import React from 'react';

import { styleBlockFullWidth } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type { ContentForRichTextVerticalSpace } from '@/services/sanity/types/rtf-content';

import styles from './sanity-content-vertical-space.module.css';

interface SanityContentVerticalSpaceProps {
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
