import React from 'react';

import ProgressiveVideo from '../../Video';
import { classNames } from '@/util/utils';
import { ContentForRichTextVideo } from '@/components/LandingPage/content';
import { styleBlockFullWidth } from '@/components/LandingPage/styles';

import styles from './sanity-content-video.module.css';

export interface SanityContentVideoProps {
  className?: string;
  value: ContentForRichTextVideo;
}

export default function SanityContentVideo({ className, value }: SanityContentVideoProps) {
  return (
    <div className={classNames(className, styles.sanityContentVideo, styleBlockFullWidth)}>
      <ProgressiveVideo src={value.url} autosize />
    </div>
  );
}
