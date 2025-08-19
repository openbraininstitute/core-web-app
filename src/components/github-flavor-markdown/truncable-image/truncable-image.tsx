import React from 'react';
import Link from 'next/link';

import { classNames } from '@/util/utils';
import { logError } from '@/util/logger';

import styles from './truncable-image.module.css';

export interface TruncableImageProps {
  className?: string;
  src?: string;
}

export default function TruncableImage({ className, src }: TruncableImageProps) {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  React.useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    console.log('🚀 [truncable-image] src =', src); // @FIXME: Remove this line written on 2025-08-19 at 13:55

    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImage(img);
    };
    img.onerror = () => {
      logError('Unable to load image:', src);
      setImage(null);
    };
  }, [src]);
  if (!image) return null;

  return (
    <Link
      className={classNames(className, styles.truncableImage)}
      href={image.src}
      target="_blank"
      style={{
        '--custom-aspect-ratio': `${image.width}/${image.height}`,
        '--custom-image': `url(${image.src})`,
        '--custom-width': `${image.width}px`,
        '--custom-height': `${image.height}px`,
      }}
    />
  );
}
