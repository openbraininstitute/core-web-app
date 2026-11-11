'use client';

import { RiFileLine } from '@remixicon/react';

import messageStyles from './message-item.module.css';
import styles from './pending-user-message.module.css';

interface PendingUserMessageProps {
  text: string;
  files: { name: string; type: string; previewUrl: string; uploaded: boolean }[];
}

export function PendingUserMessage({ text, files }: PendingUserMessageProps) {
  const imageFiles = files.filter((f) => f.type.startsWith('image/') && f.previewUrl);
  const pdfFiles = files.filter((f) => !f.type.startsWith('image/'));

  return (
    <div className={messageStyles.user}>
      <div className={messageStyles.userContent}>
        {imageFiles.length > 0 && (
          <div className={messageStyles.userImageRow}>
            {imageFiles.map((file) =>
              file.uploaded ? (
                <img
                  key={file.name}
                  src={file.previewUrl}
                  alt={file.name}
                  className={messageStyles.userImage}
                />
              ) : (
                <div key={file.name} className={styles.pendingFile}>
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className={messageStyles.userImage}
                    style={{ opacity: 0.6 }}
                  />
                  <div className={styles.pendingFileOverlay}>
                    <span className={styles.pendingFileSpinner} />
                  </div>
                </div>
              )
            )}
          </div>
        )}
        {pdfFiles.map((file) => (
          <div key={file.name} className={messageStyles.pdfAttachment}>
            <span className={messageStyles.pdfIcon}>
              {file.uploaded ? (
                <RiFileLine size={20} />
              ) : (
                <span className={styles.pendingPdfSpinner} />
              )}
            </span>
            <span className={messageStyles.pdfName}>{file.name}</span>
          </div>
        ))}
        <div>{text}</div>
      </div>
    </div>
  );
}
