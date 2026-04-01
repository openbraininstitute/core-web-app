'use client';

import { type DragEvent, useCallback, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

export interface ICsvUploadDropzoneProps {
  onFileSelect?: (file: File) => void;
  /** `accept` string for the file input (default: CSV). */
  accept?: string;
  /** Stable id linking the visible label to the hidden input. */
  inputId?: string;
  className?: string;
}

export function CsvUploadDropzone({
  onFileSelect,
  accept = '.csv,text/csv',
  inputId = 'entity-import-csv-dropzone-input',
  className,
}: ICsvUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  const handleFile = useCallback(
    (file: File) => {
      onFileSelect?.(file);
    },
    [onFileSelect]
  );

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: native drag-and-drop target; browse via associated label
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'flex min-h-[min(280px,50vh)] w-full flex-col items-center justify-center rounded-[1.5rem] bg-white px-8 py-16 transition-colors',
        isDragging && 'bg-neutral-50',
        className
      )}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            handleFile(file);
          }
          event.currentTarget.value = '';
        }}
      />
      <p className="text-center text-base font-medium text-neutral-400">
        Drag and drop your file here
      </p>
      <p className="mt-2 text-center text-sm font-medium text-neutral-400">or</p>
      <label
        htmlFor={inputId}
        className="mt-2 cursor-pointer text-center text-base font-medium text-primary-9 underline decoration-primary-9 underline-offset-2"
      >
        Browse files from your computer
      </label>
    </div>
  );
}
