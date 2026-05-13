'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppNotification } from '@/components/notification';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const ACCEPTED_FILE_TYPES = [...ACCEPTED_IMAGE_TYPES, 'application/pdf'];

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export interface FileAttachment {
  id: string;
  file: File;
  previewUrl: string;
}

export function useFileAttachments() {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const attachmentsRef = useRef<FileAttachment[]>([]);
  const { error: notifyError } = useAppNotification();

  // Keep ref in sync for cleanup
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) => {
        if (a.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(a.previewUrl);
        }
      });
    };
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const valid: FileAttachment[] = [];

      for (const file of fileArray) {
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
          notifyError({
            message: 'Invalid file type',
            description: 'Accepted: JPEG, PNG, GIF, WebP, and PDF.',
          });
          continue;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          notifyError({
            message: 'File too large',
            description: 'Files must be 20 MB or smaller.',
          });
          continue;
        }

        const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
        valid.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: isImage ? URL.createObjectURL(file) : '',
        });
      }

      if (valid.length > 0) {
        setAttachments((prev) => [...prev, ...valid]);
      }
    },
    [notifyError]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments((prev) => {
      prev.forEach((a) => {
        if (a.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(a.previewUrl);
        }
      });
      return [];
    });
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && ACCEPTED_FILE_TYPES.includes(item.type)) {
          const file = item.getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        addFiles(pastedFiles);
      }
    },
    [addFiles]
  );

  return {
    attachments,
    addFiles,
    removeAttachment,
    clearAttachments,
    handlePaste,
  };
}
