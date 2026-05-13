import { CloseOutlined } from '@ant-design/icons';

import { classNames } from '@/util/utils';

import type { FileAttachment } from '../hooks/use-file-attachments';

import styles from './attachment-preview.module.css';

interface AttachmentPreviewProps {
  attachments: FileAttachment[];
  onRemove: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className={styles.container}>
      {attachments.map((attachment) => {
        const isPdf = attachment.file.type === 'application/pdf';

        return (
          <div key={attachment.id} className={styles.thumbnail}>
            {isPdf ? (
              <div className={styles.pdfPlaceholder}>
                <span className={styles.pdfLabel}>PDF</span>
                <span className={styles.pdfName}>{attachment.file.name}</span>
              </div>
            ) : (
              <img src={attachment.previewUrl} alt="attachment preview" className={styles.image} />
            )}
            <button
              type="button"
              onClick={() => onRemove(attachment.id)}
              className={classNames(styles.removeButton)}
              aria-label={`Remove ${attachment.file.name}`}
            >
              <CloseOutlined style={{ fontSize: '10px' }} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
