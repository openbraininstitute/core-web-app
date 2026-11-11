'use client';

import { Form } from 'antd';

import { resolveMeshFile } from '@/api/one/em-cell-mesh';
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
  accept = ['application/obj', '.obj', 'model/gltf-binary', '.glb'],
  multiple = true,
  className,
  onFilesChange,
}: IAssetUploadProps) {
  const form = Form.useFormInstance();

  const validateMeshFile = async (file: File): Promise<string | null> => {
    const { data: resolution, error } = await tryCatch(resolveMeshFile(file));
    if (error || !resolution?.isValid) {
      return messages.ResolveMeshFileFailed.replace('$$', file.name);
    }
    return null;
  };

  return (
    <>
      <Form.Item name={['assets', 'mesh']} noStyle>
        <HiddenSentinel />
      </Form.Item>

      <AssetUpload
        maxFiles={maxFiles}
        maxSize={maxSize}
        accept={accept}
        multiple={multiple}
        className={className}
        acceptLabel="obj, glb"
        onValidateFile={validateMeshFile}
        onFilesChange={(files) => {
          const file = files[0]?.file instanceof File ? (files[0].file as File) : undefined;

          // Defer form update out of the current render/state-update cycle.
          setTimeout(() => {
            form.setFieldsValue({ assets: { mesh: file } });
          }, 0);

          onFilesChange?.(files);
        }}
      />
    </>
  );
}
