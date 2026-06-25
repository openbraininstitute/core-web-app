/* eslint-disable @next/next/no-img-element */
/** biome-ignore-all lint/performance/noImgElement: images are user-uploaded with dynamic URLs */
'use client';

import { useRef } from 'react';

import FullscreenDialog from './plots/fullscreen-dialog/fullscreen-dialog';

import styles from './message-item.module.css';
import dialogStyles from './plots/fullscreen-dialog/fullscreen-dialog.module.css';

interface ExpandableImageProps {
  src: string;
  alt?: string;
}

/**
 * Renders a user-uploaded image with its natural .userImage styling.
 * Clicking it opens a fullscreen dialog — same UX as TruncableImage
 * but without the fixed 600px / 4:3 container used for plots.
 */
export function ExpandableImage({ src, alt = 'Attached image' }: ExpandableImageProps) {
  const refDialog = useRef<HTMLDialogElement | null>(null);

  const handleShow = () => {
    refDialog.current?.showModal();
  };

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: img acts as a clickable preview */}
      <img
        src={src}
        alt={alt}
        className={styles.userImage}
        style={{ cursor: 'pointer' }}
        onClick={handleShow}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleShow();
          }
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: img needs click-to-expand
        role="button"
        tabIndex={0}
      />
      <FullscreenDialog dialogRef={refDialog}>
        <img src={src} alt={alt} className={dialogStyles.fullscreenImage} />
      </FullscreenDialog>
    </>
  );
}
