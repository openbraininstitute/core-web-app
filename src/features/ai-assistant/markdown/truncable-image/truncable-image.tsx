/* eslint-disable @next/next/no-img-element */
/** biome-ignore-all lint/performance/noImgElement: the images are coming from remote here */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: the images are coming from remote here */

import { FullscreenOutlined } from '@ant-design/icons';
import React from 'react';

import FullscreenDialog from '@/features/ai-assistant/message-item/plots/fullscreen-dialog/fullscreen-dialog';
import ToolSkeleton from '@/features/ai-assistant/message-item/plots/renderers/skeleton/tool-skeleton';
import { logError } from '@/utils/logger';

import dialogStyles from '@/features/ai-assistant/message-item/plots/fullscreen-dialog/fullscreen-dialog.module.css';
import styles from './truncable-image.module.css';

export interface TruncableImageProps {
  src?: string;
  isStreaming?: boolean;
}

export default function TruncableImage({ src, isStreaming }: TruncableImageProps) {
  const refDialog = React.useRef<HTMLDialogElement | null>(null);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  // Freeze the animation decision at mount time. If the component mounts during
  // streaming it animates; if Streamdown remounts it later (same stream), the fresh
  // instance captures the current isStreaming value — no double-trigger risk.
  const shouldAnimateRef = React.useRef(!!isStreaming);
  const [animationDone, setAnimationDone] = React.useState(!shouldAnimateRef.current);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the pattern seems correct here.
  React.useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [src]);

  // Single-fire timer: runs once on mount if animating. Empty deps = no re-trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional single-fire on mount
  React.useEffect(() => {
    if (!shouldAnimateRef.current) return;
    const timer = setTimeout(() => setAnimationDone(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const showImage = imageLoaded && animationDone;

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

  const containerEl = (
    <div className={styles.container}>
      {showImage && (
        <button
          type="button"
          onClick={handleShow}
          className={styles.fullscreenButton}
          aria-label="View fullscreen"
        >
          <FullscreenOutlined />
        </button>
      )}
      {!showImage && <ToolSkeleton />}
      <img
        className={styles.image}
        src={src}
        alt=""
        style={{
          display: showImage ? 'block' : 'none',
          cursor: 'pointer',
        }}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          logError('Unable to load image:', src);
          setImageError(true);
        }}
        onClick={handleShow}
        onKeyDown={(evt) => {
          if (![' ', 'Enter'].includes(evt.key)) return;

          evt.preventDefault();
          evt.stopPropagation();
          handleShow();
        }}
      />
    </div>
  );

  return (
    <>
      {shouldAnimateRef.current ? (
        <div className={styles.streamingReveal}>{containerEl}</div>
      ) : (
        containerEl
      )}
      <FullscreenDialog dialogRef={refDialog}>
        <img src={src} alt="" className={dialogStyles.fullscreenImage} />
      </FullscreenDialog>
    </>
  );
}
