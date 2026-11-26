'use client';

import { AlertOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { useState } from 'react';

import { Alert, AlertContent, AlertDescription, AlertIcon } from '@/ui/molecules/alert';
import { checkMeshFile, OBJ_MAX_BYTES } from '@/ui/segments/contribute/em-cell-mesh/helpers';
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
  maxSize = OBJ_MAX_BYTES,
  accept = ['application/obj', '.obj', 'model/gltf-binary', '.glb'],
  multiple = true,
  className,
  onFilesChange,
}: IAssetUploadProps) {
  const form = Form.useFormInstance();
  const [notice, setNotice] = useState<string | null>(null);

  const validateMeshFile = async (file: File): Promise<string | null> => {
    const { error, notice: fileNotice } = await checkMeshFile(file);
    setNotice(fileNotice);
    return error;
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
          if (!file) setNotice(null);

          // Defer form update out of the current render/state-update cycle.
          setTimeout(() => {
            form.setFieldsValue({ assets: { mesh: file } });
          }, 0);

          onFilesChange?.(files);
        }}
      />

      {notice && (
        <Alert
          variant="warning"
          appearance="light"
          className="mt-5"
          data-testid="em-mesh-upload-notice"
        >
          <AlertIcon>
            <AlertOutlined />
          </AlertIcon>
          <AlertContent>
            <AlertDescription>{notice}</AlertDescription>
          </AlertContent>
        </Alert>
      )}
    </>
  );
}
