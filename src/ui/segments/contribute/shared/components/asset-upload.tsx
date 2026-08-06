/* eslint-disable react/jsx-props-no-spreading */
'use client';

import { AlertOutlined, LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useEffect, useState } from 'react';

import { DownloadAsBoxIcon } from '@/components/icons/buttons';
import { FileDownloadLine } from '@/components/icons/File';
import { type FileWithPreview, formatBytes, useFileUpload } from '@/ui/hooks/use-file-upload';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/ui/molecules/alert';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

export interface IAssetUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string | string[];
  multiple?: boolean;
  className?: string;
  acceptLabel?: string;
  onValidateFile?: (file: File) => Promise<string | null> | string | null;
  onFilesChange?: (files: FileWithPreview[]) => void;
}

function getFileTypeLabel(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? 'file';
}

export function AssetUpload({
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024 * 1024, // 10 GB
  accept = '*',
  multiple = false,
  className,
  acceptLabel,
  onValidateFile,
  onFilesChange,
}: IAssetUploadProps) {
  const [validating, setValidating] = useState(false);
  const [fileList, setFileList] = useState<File[]>([]);

  const [
    { isDragging, errors, files: uploadedFiles },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      getInputProps,
      clearFiles: clearUploadedFiles,
    },
  ] = useFileUpload({
    maxFiles,
    maxSize,
    accept,
    multiple,
    initialFiles: [],
    onFilesChange,
    async onFilesAdded(addedFiles, setState) {
      setValidating(true);

      const localErrors: string[] = [];
      const validFiles: FileWithPreview[] = [];

      for (const addedFile of addedFiles) {
        const file = addedFile.file as File;

        if (onValidateFile) {
          // eslint-disable-next-line no-await-in-loop
          const error = await onValidateFile(file);
          if (error) {
            localErrors.push(error);
            continue;
          }
        }

        validFiles.push({
          file,
          id: crypto.randomUUID(),
          type: getFileTypeLabel(file),
        });
      }

      const newFileList = validFiles.map((f) => f.file as File);
      setFileList((prev) => [...prev, ...newFileList]);

      setState((prev) => ({
        ...prev,
        files: [...prev.files, ...validFiles],
        errors: localErrors,
      }));

      if (validFiles.length > 0) {
        await Promise.resolve();
        onFilesChange?.(validFiles);
      }

      setValidating(false);
    },
  });

  useEffect(() => {
    if (uploadedFiles.length > 0) {
      setFileList(uploadedFiles.map((f) => f.file as File));
    }
  }, [uploadedFiles]);

  const handleClearAllFiles = (): void => {
    setFileList([]);
    clearUploadedFiles();
  };

  return (
    <div className={cn('w-full', className)}>
      <label
        className={cn(
          'border-neutral-1 shadow-bnb relative rounded-xl border p-8 text-center transition-colors block cursor-pointer',
          isDragging ? 'border-primary-8 bg-primary/5' : 'hover:border-neutral-2'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input {...getInputProps()} className="sr-only" />

        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full',
              isDragging ? 'bg-primary-9/10' : 'bg-transparent'
            )}
          >
            {validating ? (
              <Spin indicator={<LoadingOutlined className="text-primary-8" spin />} size="large" />
            ) : (
              <FileDownloadLine
                className={cn('size-10', isDragging ? 'text-primary-9' : 'text-primary-8')}
              />
            )}
          </div>

          <div className="space-y-2 select-none">
            <div className="text-muted-foreground text-sm">
              <p>Drag and drop your files here</p>
              <p>or</p>
              <span className="text-primary-9 underline cursor-pointer inline-block mt-2 font-medium">
                Browse files from your computer
              </span>
              {acceptLabel && (
                <div className="text-label my-1.5 text-sm">Accepted file type: {acceptLabel}</div>
              )}
            </div>
          </div>
        </div>
      </label>

      {fileList.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-4">
              <h4 className="text-sm font-medium text-primary-9">Files ({fileList.length})</h4>
              <div className="text-muted-foreground text-xs">
                Total: {formatBytes(fileList.reduce((acc, file) => acc + file.size, 0))}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAllFiles}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              Clear all
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 select-none sm:grid-cols-3 md:grid-cols-4">
            {fileList.map((fileItem) => (
              <div
                key={fileItem.name}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-neutral-1"
              >
                <div className="flex flex-1 flex-col items-center justify-center bg-neutral-50 py-6">
                  <FileDownloadLine className="h-10 w-10 text-primary-4" />
                  <span className="mt-2 text-xs font-bold uppercase text-primary-6">
                    {getFileTypeLabel(fileItem)}
                  </span>
                </div>
                <div className="bg-white p-2">
                  <p className="truncate text-xs font-medium text-primary-9" title={fileItem.name}>
                    {fileItem.name}
                  </p>
                  <p className="text-[10px] text-primary-5">{formatBytes(fileItem.size)}</p>
                </div>
                <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 bg-white/80 backdrop-blur shadow-sm"
                    onClick={() => {
                      const url = URL.createObjectURL(fileItem);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = fileItem.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <DownloadAsBoxIcon className="size-4 text-primary-7" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <Alert variant="destructive" appearance="light" className="mt-5">
          <AlertIcon>
            <AlertOutlined />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>File upload error(s)</AlertTitle>
            <AlertDescription>
              {errors.map((error, idx) => (
                <p key={`err-${idx}`} className="text-xs">
                  {error}
                </p>
              ))}
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}
    </div>
  );
}
