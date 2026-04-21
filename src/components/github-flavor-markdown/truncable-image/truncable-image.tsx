/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */

import React from 'react';

import ToolSkeleton from '@/components/ai-assistant/message-item/storage-plots/renderers/skeleton/tool-skeleton';
import { logError } from '@/util/logger';

import styles from './truncable-image.module.css';

export interface TruncableImageProps {
  className?: string;
  src?: string;
  isStreaming?: boolean;
}

export default function TruncableImage({ className, src, isStreaming }: TruncableImageProps) {
  const refDialog = React.useRef<HTMLDialogElement | null>(null);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [src]);

  const handleShow = () => {
    refDialog.current?.showModal();
  };

  const handleHide = () => {
    refDialog.current?.close();
  };

  if (imageError && src) {
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

  if (!src) return null;

  return (
    <>
      <div className={styles.container}>
        {!imageLoaded && <ToolSkeleton />}
        <img
          className={styles.image}
          src={src}
          alt=""
          style={{
            display: imageLoaded ? 'block' : 'none',
            cursor: 'pointer',
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            logError('Unable to load image:', src);
            setImageError(true);
          }}
          onClick={handleShow}
        />
      </div>
      <dialog ref={refDialog} className={styles.dialog}>
        <button
          type="button"
          onClick={handleHide}
          className={styles.closeButton}
          aria-label="Close fullscreen"
        >
          ✕
        </button>
        <button type="button" onClick={handleHide} className={styles.imageBackdrop}>
          <img src={src} />
        </button>
      </dialog>
    </>
  );
}
