import React from 'react';

import { Text } from '../../Text';
import { ContentForRichTextParagraph } from '../../../content/types';
import { styleBlockSmall } from '../../../styles';
import { classNames } from '@/util/utils';

import styles from './SanityContentParagraph.module.css';

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
