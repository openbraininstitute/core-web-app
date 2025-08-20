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
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    setError(false);
    if (!src) {
      setImage(null);
      return;
    }

    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImage(img);
    };
    img.onerror = () => {
      logError('Unable to load image:', src);
      setError(true);
      setImage(null);
    };
  }, [src]);
  if (error && src) {
    return (
      <Link className={styles.error} href={src} target="_blank">
        Unable to load image!
      </Link>
    );
  }

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
