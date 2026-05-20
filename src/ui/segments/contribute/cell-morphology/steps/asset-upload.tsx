/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { AlertOutlined, LoadingOutlined } from '@ant-design/icons';
import { Form, Spin } from 'antd';
import { isNil, reject } from 'es-toolkit/compat';
import JSZip from 'jszip';
import { useState } from 'react';

import { resolveNeuronFile, isNeuronFileError } from '@/api/one/cell-morphology';
import { tryCatch } from '@/api/utils';
import { DownloadAsBoxIcon } from '@/components/icons/buttons';
import { FileDownloadLine } from '@/components/icons/File';
import { messages } from '@/i18n/en/upload';
import { type FileWithPreview, formatBytes, useFileUpload } from '@/ui/hooks/use-file-upload';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/ui/molecules/alert';
import { Button } from '@/ui/molecules/button';
import { CELL_MORPHOLOGY_FILE_TYPES } from '@/ui/segments/contribute/cell-morphology/schema';
import { getFileExtension, parseFileName } from '@/ui/segments/contribute/shared/helpers';
import { cn } from '@/utils/css-class';

import type { TCellMorphologyForm } from '@/ui/segments/contribute/cell-morphology/schema';
import type { IFileTypeConfig } from '@/ui/segments/contribute/shared/helpers';

interface IAssetUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string | Array<string>;
  multiple?: boolean;
  className?: string;
  onFilesChange?: (files: Array<FileWithPreview>) => void;
}

function getFileExtensionByTypeOrMimeType(file: File): string | undefined {
  const extension = getFileExtension(
    file,
    CELL_MORPHOLOGY_FILE_TYPES as unknown as Array<IFileTypeConfig>
  );
  return extension?.toLowerCase();
}

export function AssetUpload({
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024,
  accept = [
    'application/swc',
    'application/asc',
    'application/x-hdf5',
    'h5',
    'asc',
    'swc',
    'SWC',
    'H5',
    'ASC',
  ],
  multiple = true,
  className,
  onFilesChange,
}: IAssetUploadProps) {
  const form = Form.useFormInstance();
  const { assets } = form.getFieldsValue(['assets']) as {
    assets: TCellMorphologyForm['assets'];
  };
  const [resolveNeuronFileLoading, setResolveNeuronFileLoading] = useState(false);
  const [originalFileType, setOriginalFileType] = useState<string | null>(null);

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
      const file = addedFiles[0].file as File;
      setResolveNeuronFileLoading(true);
      const { data: resolution, error } = await tryCatch(resolveNeuronFile(file as File));

      if (error) {
        setResolveNeuronFileLoading(false);

        const neuronError = isNeuronFileError(error) ? error.neuronFileError : null;
        const detailMessage = neuronError?.detail ?? (error as Error).message ?? 'An unknown error occurred';

        setState((prev) => ({
          ...prev,
          errors: [messages.ResolveNeuronFileFailed.replace('$$', file.name), detailMessage],
        }));
        return;
      }

      if (resolution?.isValid) {
        const zip = new JSZip();
        const unzippedData = await zip.loadAsync(resolution.buffer, {});
        const fsAdded = await Promise.all(
          Object.entries(unzippedData.files)
            .filter(([, value]) => !value.dir)
            .map(([_, value]) => value.async('blob'))
        );
        const { name: originalFileName } = parseFileName(file.name);

        const newFiles = fsAdded.map((f, index) => {
          const extractedName = `${originalFileName}.${Object.keys(unzippedData.files)[index].split('.').pop()}`;
          const builtFile = new File([f], extractedName, { type: f.type });
          const finalType = getFileExtensionByTypeOrMimeType(builtFile);
          return {
            file: builtFile,
            id: crypto.randomUUID(),
            type: finalType,
          };
        });

        const originalFileExt = file.name.split('.').pop()?.toLowerCase();
        const originalFile = {
          file: new File([addedFiles[0].file as File], (addedFiles[0].file as File).name, {
            type: (addedFiles[0].file as File).type,
          }),
          id: crypto.randomUUID(),
          type: originalFileExt,
        };
        const allFiles = [...newFiles, originalFile];

        setOriginalFileType(originalFile.type ?? null);

        form.setFieldsValue({
          assets: {
            swc: allFiles.find((f) => f.type === 'swc')?.file,
            asc: allFiles.find((f) => f.type === 'asc')?.file,
            h5: allFiles.find((f) => f.type === 'h5')?.file,
          },
        });

        form.validateFields(['assets']);

        setState((prev) => ({
          ...prev,
          files: [...prev.files, ...reject(allFiles, (o) => isNil(o.file))],
        }));
      }
      setResolveNeuronFileLoading(false);
    },
  });

  const handleClearAllFiles = (): void => {
    form.setFieldsValue({
      assets: {
        swc: undefined,
        asc: undefined,
        h5: undefined,
      },
    });
    setOriginalFileType(null);
    clearFiles();
    form.validateFields(['assets']);
  };

  return (
    <Form.Item name="assets">
      <div className={cn('w-full', className)}>
        <div className="mb-3 flex flex-wrap items-center justify-between select-none">
          <h2 className="text-primary-9 text-xl font-bold">Upload new morphology file</h2>
        </div>
        <section
          aria-label="File upload dropzone"
          className={cn(
            'border-neutral-1 shadow-bnb relative rounded-xl border p-8 text-center transition-colors',
            isDragging ? 'border-primary-8 bg-primary/5' : 'border-neutral-1 hover:border-neutral-1'
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
              {resolveNeuronFileLoading ? (
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
                <div className="text-label my-1.5 text-sm">
                  Accepted file types: swc, neurolucida asc, or{' '}
                  <a
                    rel="noopener noreferrer"
                    target="_blank"
                    className="text-primary-7 underline"
                    href="https://morphology-documentation.readthedocs.io/en/latest/h5v1.html"
                  >
                    h5
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!isNil(assets) && Object.values(assets).filter((file) => !isNil(file)).length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h4 className="text-sm font-medium">
                Files ({Object.values(assets).filter((file) => !isNil(file)).length})
              </h4>
              <div className="text-muted-foreground text-xs">
                Total:{' '}
                {formatBytes(
                  Object.values(assets)
                    .filter((file) => !isNil(file))
                    .reduce((acc, file) => acc + (file as File).size, 0)
                )}
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

        {!isNil(assets) && Object.values(assets).filter((file) => !isNil(file)).length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 select-none sm:grid-cols-3 md:grid-cols-4">
            {Object.values(assets)
              .filter((file): file is File => !isNil(file))
              .sort((a, b) => {
                const aType = getFileExtensionByTypeOrMimeType(a);
                const bType = getFileExtensionByTypeOrMimeType(b);
                const aIsOriginal = aType === originalFileType;
                const bIsOriginal = bType === originalFileType;
                if (aIsOriginal && !bIsOriginal) return -1;
                if (!aIsOriginal && bIsOriginal) return 1;
                return 0;
              })
              .map((fileItem) => {
                const fileType = getFileExtensionByTypeOrMimeType(fileItem);
                const isGenerated = originalFileType !== null && fileType !== originalFileType;

                return (
                  <div key={fileItem.name} className="group relative aspect-square">
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
                        <p className="line-clamp-1 truncate text-xs font-medium">{fileItem.name}</p>
                        <p className="text-primary-8 text-xs">{formatBytes(fileItem.size)}</p>
                      </div>
                      <Button
                        variant="icon"
                        className="group"
                        type="button"
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
                        <DownloadAsBoxIcon className="group-hover:text-primary-6" />
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive" appearance="light" className="mt-5 bg-red-50 border-red-200">
            <AlertIcon>
              <AlertOutlined />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>File upload error(s)</AlertTitle>
              <AlertDescription>
                {errors.map((error, idx) => (
                  <p key={idx} className="last:mb-0 whitespace-pre-wrap font-mono text-xs">
                    {error}
                  </p>
                ))}
              </AlertDescription>
            </AlertContent>
          </Alert>
        )}
      </div>
    </Form.Item>
  );
}
