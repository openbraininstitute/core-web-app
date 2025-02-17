import React from 'react';

import Title from '../../Title';
import { Text } from '../../Text';
import ProgressiveImage from '../../ProgressiveImage';
import { classNames } from '@/util/utils';
import { ContentForRichTextPreview } from '@/components/LandingPage/content';
import { styleBlockSmall, styleLayout } from '@/components/LandingPage/styles';

import { gotoSection } from '@/components/LandingPage/utils';
import styles from './SanityContentPreview.module.css';

export interface SanityContentPreviewProps {
  value: ContentForRichTextPreview;
}

export default function SanityContentPreview({ value }: SanityContentPreviewProps) {
  return (
    <div
      className={classNames(
        styles.sanityContentPreview,
        styleLayout,
        value.background ? styles.dark : styles.light
      )}
    >
      {value.background && (
        <ProgressiveImage
          className={styles.background}
          src={value.background.url}
          width={value.background.width}
          height={value.background.height}
          alt="Background"
        />
      )}
      <Title value={value.title} />
      <div className={classNames(styles.content, styleBlockSmall)}>
        {value.image && (
          <ProgressiveImage
            className={styles.vignette}
            src={value.image.url}
            width={value.image.width}
            height={value.image.height}
            alt="Vignette"
          />
        )}
        <div className={styles.text}>
          {value.text && <Text value={value.text} />}
          {value.button && (
            <button
              type="button"
              className={styles.button}
              onClick={() => gotoSection(value.button?.link ?? '')}
            >
              {value.button.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
