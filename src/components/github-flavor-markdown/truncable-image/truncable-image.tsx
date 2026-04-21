/* eslint-disable @next/next/no-img-element */

import { FullscreenOutlined } from '@ant-design/icons';
import React from 'react';

import FullscreenDialog from '@/components/ai-assistant/message-item/fullscreen-dialog/fullscreen-dialog';
import ToolSkeleton from '@/components/ai-assistant/message-item/storage-plots/renderers/skeleton/tool-skeleton';
import { logError } from '@/util/logger';

import dialogStyles from '@/components/ai-assistant/message-item/fullscreen-dialog/fullscreen-dialog.module.css';
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
        {imageLoaded && (
          <button
            type="button"
            onClick={handleShow}
            className={styles.fullscreenButton}
            aria-label="View fullscreen"
          >
            <FullscreenOutlined />
          </button>
        )}
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
      <FullscreenDialog dialogRef={refDialog}>
        <img src={src} alt="" className={dialogStyles.fullscreenImage} />
      </FullscreenDialog>
    </>
  );
}
