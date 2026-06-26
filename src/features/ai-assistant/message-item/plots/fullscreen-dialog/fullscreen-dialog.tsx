import { CloseOutlined } from '@ant-design/icons';

import type React from 'react';

import styles from './fullscreen-dialog.module.css';

interface FullscreenDialogProps {
  children: React.ReactNode;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
}

export default function FullscreenDialog({ children, dialogRef }: FullscreenDialogProps) {
  const handleClose = () => {
    dialogRef.current?.close();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleBackdropKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      {/* biome-ignore lint/a11y/useSemanticElements: backdrop acts as a dismissal area, not a standalone button */}
      <div
        className={styles.backdrop}
        onClick={handleBackdropClick}
        onKeyDown={handleBackdropKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      >
        <div className={styles.content}>
          <button
            type="button"
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="Close fullscreen"
          >
            <CloseOutlined />
          </button>
          {children}
        </div>
      </div>
    </dialog>
  );
}
