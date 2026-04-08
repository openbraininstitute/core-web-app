'use client';

import { useEffect } from 'react';

import type { RefObject } from 'react';

interface IImportHeaderUploadInputsProps {
  uploadInputRef: RefObject<HTMLInputElement | null>;
  bulkUploadInputRef: RefObject<HTMLInputElement | null>;
  onPrepareCsvUpload: () => void;
  onUploadCsvFile: (file: File) => Promise<void>;
  onUploadBulkFiles?: (files: Array<File>) => Promise<void>;
}

export function ImportHeaderUploadInputs({
  uploadInputRef,
  bulkUploadInputRef,
  onPrepareCsvUpload,
  onUploadCsvFile,
  onUploadBulkFiles,
}: IImportHeaderUploadInputsProps) {
  useEffect(() => {
    const input = bulkUploadInputRef.current;
    if (!input) {
      return;
    }

    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
  }, [bulkUploadInputRef]);

  return (
    <>
      <input
        ref={uploadInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            onPrepareCsvUpload();
            void onUploadCsvFile(file);
            event.currentTarget.value = '';
          }
        }}
      />
      <input
        ref={bulkUploadInputRef}
        data-bulk-file-upload-input="true"
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          if (files.length > 0 && onUploadBulkFiles) {
            void onUploadBulkFiles(files);
          }
          event.currentTarget.value = '';
        }}
      />
    </>
  );
}
