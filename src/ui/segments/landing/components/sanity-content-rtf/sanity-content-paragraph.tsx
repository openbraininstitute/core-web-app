import React from 'react';

import { styleBlockSmall } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import { Text } from '../text/text';

import type { ContentForRichTextParagraph } from '@/services/sanity/types/rtf-content';

import styles from './sanity-content-paragraph.module.css';

interface SanityContentParagraphProps {
  value: ContentForRichTextParagraph;
}

export default function SanityContentParagraph({ value }: SanityContentParagraphProps) {
  return (
    <div className={classNames(styles.sanityContentParagraph, styleBlockSmall)}>
      <Text value={value.content} />
    </div>
  );
}
