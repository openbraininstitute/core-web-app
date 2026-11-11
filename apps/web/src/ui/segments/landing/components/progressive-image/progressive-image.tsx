'use client';

import Image from 'next/image';
import { useState } from 'react';

import { classNames } from '@/util/utils';

import styles from './progressive-image.module.css';

interface ProgressiveImageProps {
  className?: string;
  testId?: string;
  src: string;
  width: number;
  height: number;
  alt?: string;
  background?: string;
  forceAspectRatio?: boolean;
}

export default function ProgressiveImage({
  className,
  testId,
  src,
  width,
  height,
  alt = 'Vignette',
  background = 'var(--color-primary)',
  forceAspectRatio = false,
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      style={{
        '--custom-background': background,
        '--custom-aspect-ratio': forceAspectRatio ? `${width}/${height}` : 'none',
      }}
      className={classNames(className, styles.progressiveImage)}
      data-testid={testId}
    >
      <Image
        className={classNames(styles.image, loaded && styles.show)}
        onLoad={() => setLoaded(true)}
        src={src}
        width={width}
        height={height}
        alt={alt}
      />
    </div>
  );
}
