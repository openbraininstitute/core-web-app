import React from 'react';

import { ContentForRichTextTitle } from '../../../content/types';
import Title from '../../Title';
import { makeSpecialWidget } from './special-widget';

import styles from './SanityContentTitle.module.css';

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
