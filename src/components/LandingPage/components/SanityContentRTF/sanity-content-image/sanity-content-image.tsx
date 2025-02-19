import React from 'react';

import ProgressiveImage from '../../ProgressiveImage';
import { classNames } from '@/util/utils';
import { ContentForRichTextImage } from '@/components/LandingPage/content';
import { styleBlockMedium } from '@/components/LandingPage/styles';

import styles from './sanity-content-image.module.css';

export interface SanityContentImageProps {
  className?: string;
  value: ContentForRichTextImage;
}

export default function iSanityContentImage({ className, value }: SanityContentImageProps) {
  const { image } = value;

  if (!image) return null;

  return (
    <>
      <div
        className={classNames(className, styles.sanityContentImage, styleBlockMedium)}
        style={{ '--custom-aspect-ratio': image.width / image.height }}
      >
        <ProgressiveImage
          src={image.url}
          width={image.width}
          height={image.height}
          alt={value.alt}
        />
      </div>
    </>
  );
}
