/* eslint-disable react/jsx-props-no-spreading */
'use client';

import { AlertOutlined, LoadingOutlined } from '@ant-design/icons';
import { Form, Spin } from 'antd';
import { isNil } from 'es-toolkit/compat';
import { useEffect, useMemo, useState } from 'react';

import { resolveOBJFile } from '@/api/one/em-cell-mesh';
import { tryCatch } from '@/api/utils';
import { DownloadAsBoxIcon } from '@/components/icons/buttons';
import { FileDownloadLine } from '@/components/icons/File';
import { messages } from '@/i18n/en/upload';
import { type FileWithPreview, formatBytes, useFileUpload } from '@/ui/hooks/use-file-upload';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/ui/molecules/alert';
import { Button } from '@/ui/molecules/button';
import { EM_CELL_MESH_FILE_TYPES } from '@/ui/segments/contribute/em-cell-mesh/schema';
import { getFileExtension } from '@/ui/segments/contribute/shared/helpers';
import { cn } from '@/utils/css-class';

import type { IFileTypeConfig } from '@/ui/segments/contribute/shared/helpers';

interface IAssetUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string | string[];
  multiple?: boolean;
  className?: string;
  onFilesChange?: (files: FileWithPreview[]) => void;
}

function getFileExtensionByTypeOrMimeType(file: File): string | undefined {
  return getFileExtension(file, EM_CELL_MESH_FILE_TYPES as unknown as IFileTypeConfig[]);
}

export function AssetUpload({
  maxFiles = 1,
  maxSize = 500 * 1024 * 1024, // 500mb
  accept = ['application/obj', '.obj'],
  multiple = true,
  className,
  onFilesChange,
}: IAssetUploadProps) {
  const form = Form.useFormInstance();
  const assets = Form.useWatch(['assets'], form);

  const [resolveOBJFileLoading, setResolveOBJFileLoading] = useState(false);
  const [fileList, setFileList] = useState<File[]>([]);

  // Extract files from form assets (for backward compatibility)
  const flattenedFiles = useMemo(() => {
    if (!assets) return [];
    return Object.values(assets)
      .flat()
      .filter((file): file is File => !isNil(file) && file instanceof File);
  }, [assets]);

  // Sync form assets with local fileList state
  useEffect(() => {
    if (flattenedFiles.length > 0 && fileList.length === 0) {
      setFileList(flattenedFiles);
    }
  }, [flattenedFiles, fileList]);

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
      setResolveOBJFileLoading(true);

      const localErrors: string[] = [];
      const validFiles: FileWithPreview[] = [];

      for (const addedFile of addedFiles) {
        const file = addedFile.file as File;
        const { data: resolution, error } = await tryCatch(resolveOBJFile(file));

        if (error || !resolution?.isValid) {
          localErrors.push(messages.ResolveOBJFileFailed.replace('$$', file.name));
          continue;
        }

        validFiles.push({
          file,
          id: crypto.randomUUID(),
          type: getFileExtensionByTypeOrMimeType(file) ?? '',
        });
      }

      const newFiles = validFiles.map((f) => f.file);
      setFileList((prev) => [...prev, ...newFiles]);

      if (validFiles.length > 0) {
        form.setFieldValue(['assets', 'obj'], validFiles[0].file);
      }

      setState((prev) => ({
        ...prev,
        files: [...prev.files, ...validFiles],
        errors: localErrors,
      }));

      setResolveOBJFileLoading(false);
    },
  });

  useEffect(() => {
    if (uploadedFiles.length > 0) {
      const files = uploadedFiles.map((f) => f.file);
      setFileList(files);
    }
  }, [uploadedFiles]);

  const handleClearAllFiles = (): void => {
    form.setFieldValue(['assets', 'obj'], undefined);
    setFileList([]);
    clearUploadedFiles();
  };

  return (
    <>
      <Form.Item name={['assets', 'obj']} noStyle />

      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.assets?.obj !== curr.assets?.obj}>
        {({ getFieldValue }) => {
          const value = getFieldValue(['assets', 'obj']);
          const displayValue = value instanceof File ? value.name : (value ?? '');
          return <input type="hidden" value={displayValue} readOnly />;
        }}
      </Form.Item>

      <Form.Item>
        <div className={cn('w-full', className)}>
          {/* Main interactive element changed from div to label to fix a11y error */}
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
                {resolveOBJFileLoading ? (
                  <Spin
                    indicator={<LoadingOutlined className="text-primary-8" spin />}
                    size="large"
                  />
                ) : (
                  <FileDownloadLine
                    className={cn('size-10', isDragging ? 'text-primary-9' : 'text-primary-8')}
                  />
                )}
              </div>

              <div className="space-y-2 select-none">
                <div className="text-muted-foreground text-sm">
                  <p>Drag and drop your files here </p>
                  <p>or</p>
                  {/* Changed from Button to span to avoid nested button inside label */}
                  <span className="text-primary-9 underline cursor-pointer inline-block mt-2 font-medium">
                    Browse files from your computer
                  </span>
                  <div className="text-label my-1.5 text-sm">Accepted file type: obj</div>
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
                {fileList.map((fileItem) => {
                  const fileType = getFileExtensionByTypeOrMimeType(fileItem) ?? 'file';
                  return (
                    <div
                      key={fileItem.name}
                      className="group relative flex flex-col overflow-hidden rounded-lg border border-neutral-1"
                    >
                      <div className="flex flex-1 flex-col items-center justify-center bg-neutral-50 py-6">
                        <FileDownloadLine className="h-10 w-10 text-primary-4" />
                        <span className="mt-2 text-xs font-bold uppercase text-primary-6">
                          {fileType}
                        </span>
                      </div>
                      <div className="bg-white p-2">
                        <p
                          className="truncate text-xs font-medium text-primary-9"
                          title={fileItem.name}
                        >
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
                  );
                })}
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
      </Form.Item>
    </>
  );
}
