/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import React from 'react';
import { logError } from '@/util/logger';
import { classNames } from '@/util/utils';

import styles from './truncable-image.module.css';

export interface TruncableImageProps {
  className?: string;
  src?: string;
}

export default function TruncableImage({ className, src }: TruncableImageProps) {
  const refDialog = React.useRef<HTMLDialogElement | null>(null);
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
  const handleShow = () => {
    const dialog = refDialog.current;
    if (!dialog) return;

    dialog.showModal();
  };
  const handleHide = () => {
    refDialog.current?.close();
  };
  if (error && src) {
    return (
      <Link className={styles.error} href={src} target="_blank">
        Unable to load image!
      </Link>
    );
  }

  if (!image) return null;

  return (
    <>
      <button
        type="button"
        className={classNames(className, styles.truncableImage)}
        onClick={handleShow}
        style={{
          '--custom-aspect-ratio': `${image.width}/${image.height}`,
          '--custom-image': `url(${image.src})`,
          '--custom-width': `${image.width}px`,
          '--custom-height': `${image.height}px`,
        }}
      />{' '}
      <dialog ref={refDialog} className={styles.dialog}>
        <button type="button" onClick={handleHide}>
          <img
            src={image.src}
            width={image.width}
            height={image.height}
            style={{
              width: `${image.width}px`,
              height: `${image.height}px`,
            }}
          />
        </button>
      </dialog>
    </>
  );
}
