import React from 'react';

import Image from 'next/image';
import { classNames } from '@/util/utils';

import styles from './ProgressiveImage.module.css';

export interface ProgressiveImageProps {
  className?: string;
  src: string;
  width: number;
  height: number;
  alt?: string;
  background?: string;
}

export default function ProgressiveImage({
  className,
  src,
  width,
  height,
  alt = 'Vignette',
  background = 'var(--color-primary)',
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <div
      style={{
        '--custom-background': background,
      }}
      className={classNames(className, styles.progressiveImage)}
    >
      <Image
        className={classNames(loaded && styles.show)}
        onLoadingComplete={() => setLoaded(true)}
        src={src}
        width={width}
        height={height}
        alt={alt}
      />
    </div>
  );
}
