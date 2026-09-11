import Title from '../text/title';
import { makeSpecialWidget } from './special-widget';

import type { ContentForRichTextTitle } from '@/services/sanity/types/rtf-content';

import styles from './sanity-content-title.module.css';

interface SanityContentTitleProps {
  testId?: string;
  value: ContentForRichTextTitle;
}

export default function SanityContentTitle({ testId, value }: SanityContentTitleProps) {
  switch (value.levelType) {
    case 'h2':
      return <Title testId={testId} value={value.title} />;
    default:
      return (
        makeSpecialWidget(value.title, testId) ?? (
          <h2 className={styles.sanityContentTitle} data-testid={testId}>
            {value.title}
          </h2>
        )
      );
  }
}
