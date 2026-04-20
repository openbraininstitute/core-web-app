/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import React from 'react';

import ToolSkeleton from '@/components/ai-assistant/message-item/storage-plots/renderers/skeleton/tool-skeleton';
import { logError } from '@/util/logger';
import { classNames } from '@/util/utils';

import styles from './truncable-image.module.css';

export interface TruncableImageProps {
  className?: string;
  src?: string;
  isStreaming?: boolean;
}

export default function TruncableImage({ className, src, isStreaming }: TruncableImageProps) {
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
    if (isStreaming) return null;
    return (
      <div>
        <span className="text-gray-600">Image: </span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {src}
        </a>
      </div>
    );
  }

  if (!image) {
    if (!src || error) return null;
    return (
      <div
        style={{
          width: '600px',
          maxWidth: '100%',
          aspectRatio: '3/2',
          border: '1px solid #d9d9d9',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <ToolSkeleton />
      </div>
    );
  }

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
        <button
          type="button"
          onClick={handleHide}
          className={styles.closeButton}
          aria-label="Close fullscreen"
        >
          ✕
        </button>
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
