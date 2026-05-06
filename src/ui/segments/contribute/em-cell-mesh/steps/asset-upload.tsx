'use client';

import { Form } from 'antd';

import { resolveOBJFile } from '@/api/one/em-cell-mesh';
import { tryCatch } from '@/api/utils';
import { messages } from '@/i18n/en/upload';
import { AssetUpload } from '@/ui/segments/contribute/shared/components/asset-upload';

import type { FileWithPreview } from '@/ui/hooks/use-file-upload';

interface IAssetUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string | string[];
  multiple?: boolean;
  className?: string;
  onFilesChange?: (files: FileWithPreview[]) => void;
}

function HiddenSentinel({ value }: { value?: unknown; onChange?: (val: unknown) => void }) {
  return (
    <input
      type="hidden"
      value={value instanceof File ? value.name : ''}
      onChange={() => {}}
      aria-hidden
    />
  );
}

export function EMAssetUpload({
  maxFiles = 1,
  maxSize = 500 * 1024 * 1024,
  accept = ['application/obj', '.obj'],
  multiple = true,
  className,
  onFilesChange,
}: IAssetUploadProps) {
  const form = Form.useFormInstance();

  const validateOBJFile = async (file: File): Promise<string | null> => {
    const { data: resolution, error } = await tryCatch(resolveOBJFile(file));
    if (error || !resolution?.isValid) {
      return messages.ResolveOBJFileFailed.replace('$$', file.name);
    }
    return null;
  };

  return (
    <>
      <Form.Item name={['assets', 'obj']} noStyle>
        <HiddenSentinel />
      </Form.Item>

      <AssetUpload
        maxFiles={maxFiles}
        maxSize={maxSize}
        accept={accept}
        multiple={multiple}
        className={className}
        acceptLabel="obj"
        onValidateFile={validateOBJFile}
        onFilesChange={(files) => {
          const file = files[0]?.file instanceof File ? (files[0].file as File) : undefined;

          // Defer form update out of the current render/state-update cycle.
          setTimeout(() => {
            form.setFieldsValue({ assets: { obj: file } });
          }, 0);

          onFilesChange?.(files);
        }}
      />
    </>
  );
}
