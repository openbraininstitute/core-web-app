/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { AlertOutlined, LoadingOutlined } from '@ant-design/icons';
import { Form, Spin } from 'antd';
import { isNil } from 'es-toolkit/compat';
import { useState } from 'react';
import { resolveNWBFile } from '@/api/one/electrical-cell-recording';
import { tryCatch } from '@/api/utils';
import { DownloadAsBoxIcon } from '@/components/icons/buttons';
import { FileDownloadLine } from '@/components/icons/File';
import { messages } from '@/i18n/en/upload';
import { type FileWithPreview, formatBytes, useFileUpload } from '@/ui/hooks/use-file-upload';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/ui/molecules/alert';
import { Button } from '@/ui/molecules/button';
import type { TElectricalCellRecordingForm } from '@/ui/segments/contribute/electrical-cell-recording/schema';
import { ELECTRICAL_CELL_RECORDING_FILE_TYPES } from '@/ui/segments/contribute/electrical-cell-recording/schema';
import type { IFileTypeConfig } from '@/ui/segments/contribute/shared/helpers';
import { getFileExtension } from '@/ui/segments/contribute/shared/helpers';
import { cn } from '@/utils/css-class';

interface IAssetUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string | Array<string>;
  multiple?: boolean;
  className?: string;
  onFilesChange?: (files: Array<FileWithPreview>) => void;
}

function getFileExtensionByTypeOrMimeType(file: File): string | undefined {
  return getFileExtension(
    file,
    ELECTRICAL_CELL_RECORDING_FILE_TYPES as unknown as Array<IFileTypeConfig>
  );
}

export function AssetUpload({
  maxFiles = 1,
  maxSize = 75 * 1024 * 1024,
  accept = ['application/nwb', '.nwb'],
  multiple = true,
  className,
  onFilesChange,
}: IAssetUploadProps) {
  const form = Form.useFormInstance();
  const { assets } = form.getFieldsValue(['assets']) as {
    assets: TElectricalCellRecordingForm['assets'];
  };
  const [resolveNWBFileLoading, setResolveNWBFileLoading] = useState(false);
  const [originalFileTypes, setOriginalFileTypes] = useState<Array<string>>([]);

  const flattenedFiles = assets
    ? Object.values(assets)
        .flat()
        .filter((file) => !isNil(file))
    : [];

  const [
    { isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
      clearFiles,
    },
  ] = useFileUpload({
    maxFiles,
    maxSize,
    accept,
    multiple,
    initialFiles: [],
    onFilesChange,
    async onFilesAdded(addedFiles, setState) {
      setResolveNWBFileLoading(true);

      const localErrors: Array<string> = [];
      const validFiles: Array<FileWithPreview> = [];

      for (const addedFile of addedFiles) {
        const file = addedFile.file as File;

        const { data: resolution, error } = await tryCatch(resolveNWBFile(file));

        if (error) {
          localErrors.push(messages.ResolveNWBFileFailed.replace('$$', file.name));
          continue;
        }

        if (resolution?.isValid) {
          const originalFile = {
            file,
            id: crypto.randomUUID(),
            type: getFileExtensionByTypeOrMimeType(file) ?? '',
          };
          validFiles.push(originalFile);
        } else {
          localErrors.push(messages.ResolveNWBFileFailed.replace('$$', file.name));
        }
      }

      setOriginalFileTypes(validFiles.map((f) => f.type));

      if (validFiles.length > 0) {
        form.setFieldValue(['assets', 'nwb'], validFiles[0].file);
      }

      setState((prev) => ({
        ...prev,
        files: [...prev.files, ...validFiles],
        errors: localErrors,
      }));

      setResolveNWBFileLoading(false);
    },
  });

  const handleClearAllFiles = (): void => {
    form.setFieldValue(['assets', 'nwb'], undefined);
    setOriginalFileTypes([]);
    clearFiles();
  };

  return (
    <>
      <Form.Item name={['assets', 'nwb']} className="hidden">
        <input type="hidden" />
      </Form.Item>

      <Form.Item>
        <div className={cn('w-full', className)}>
          <div
            className={cn(
              'border-neutral-1 shadow-bnb relative rounded-xl border p-8 text-center transition-colors',
              isDragging
                ? 'border-primary-8 bg-primary/5'
                : 'border-neutral-1 hover:border-neutral-1'
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
                {resolveNWBFileLoading ? (
                  <Spin
                    indicator={<LoadingOutlined className="text-primary-8" spin />}
                    size="large"
                    className="text-primary-8"
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
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={openFileDialog}
                    className="text-primary-9 underline"
                  >
                    Browse files from your computer
                  </Button>
                  <div className="text-label my-1.5 text-sm">Accepted file type: nwb</div>
                </div>
              </div>
            </div>
          </div>

          {flattenedFiles.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h4 className="text-sm font-medium">Files ({flattenedFiles.length})</h4>
                <div className="text-muted-foreground text-xs">
                  Total: {formatBytes(flattenedFiles.reduce((acc, file) => acc + file.size, 0))}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAllFiles}
                className="text-red-600 hover:text-red-700"
              >
                Clear all files
              </Button>
            </div>
          )}

          {flattenedFiles.length > 0 && (
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 select-none sm:grid-cols-3 md:grid-cols-4">
              {flattenedFiles
                .sort((a, b) => {
                  const aType = getFileExtensionByTypeOrMimeType(a) ?? '';
                  const bType = getFileExtensionByTypeOrMimeType(b) ?? '';
                  const aIsOriginal = originalFileTypes.includes(aType);
                  const bIsOriginal = originalFileTypes.includes(bType);
                  if (aIsOriginal && !bIsOriginal) return -1;
                  if (!aIsOriginal && bIsOriginal) return 1;
                  return 0;
                })
                .map((fileItem) => {
                  const fileType = getFileExtensionByTypeOrMimeType(fileItem) ?? '';
                  const isGenerated =
                    originalFileTypes.length > 0 && !originalFileTypes.includes(fileType);

                  return (
                    <div key={fileItem.name} className="group relative aspect-square">
                      {isGenerated && (
                        <div className="absolute -top-6 right-0 left-0 flex items-center justify-center">
                          <span className="bg-primary-1 text-primary-8 rounded px-2 py-0.5 text-xs font-medium">
                            Generated by our tool
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          'bg-background flex h-full w-full flex-col items-center justify-center rounded-t-lg border border-b-0',
                          isGenerated ? 'border-primary-6 border-2' : 'border-neutral-1'
                        )}
                      >
                        <FileDownloadLine className="text-primary-6 h-8 w-8" />
                        <p className="text-primary-8 text-sm font-light">{fileType}</p>
                      </div>
                      <div
                        className={cn(
                          'bg-neutral-1 text-primary-9 flex items-center justify-between gap-1.5 rounded-b-lg border border-t-0 py-2 pl-2 opacity-100 transition-opacity',
                          isGenerated ? 'border-primary-6 border-2 border-t-0' : 'border-neutral-1'
                        )}
                      >
                        <div className="flex max-w-full min-w-0 flex-col gap-1">
                          <p className="line-clamp-1 truncate text-xs font-medium">
                            {fileItem.name}
                          </p>
                          <p className="text-primary-8 text-xs">{formatBytes(fileItem.size)}</p>
                        </div>
                        <Button
                          variant="icon"
                          className="group"
                          type="button"
                          onClick={() => {
                            if (fileItem instanceof File) {
                              const url = URL.createObjectURL(fileItem);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = fileItem.name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }
                          }}
                        >
                          <DownloadAsBoxIcon className="group-hover:text-primary-6" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
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
                  {errors.map((error, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <p key={`alert-error-${index}`} className="last:mb-0">
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
