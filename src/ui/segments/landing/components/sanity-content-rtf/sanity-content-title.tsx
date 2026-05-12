import React from 'react';

import Title from '../text/title';
import { makeSpecialWidget } from './special-widget';

import type { ContentForRichTextTitle } from '@/services/sanity/types/rtf-content';

import styles from './sanity-content-title.module.css';

interface SanityContentTitleProps {
  value: ContentForRichTextTitle;
}

export default function SanityContentTitle({ value }: SanityContentTitleProps) {
  switch (value.levelType) {
    case 'h2':
      return <Title value={value.title} />;
    default:
      return (
        makeSpecialWidget(value.title) ?? (
          <h2 className={styles.sanityContentTitle}>{value.title}</h2>
        )
      );
  }
}
