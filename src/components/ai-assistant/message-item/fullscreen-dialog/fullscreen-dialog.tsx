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

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div className={styles.backdrop} onClick={handleBackdropClick}>
        <div className={styles.content} onClick={(e) => e.stopPropagation()}>
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
