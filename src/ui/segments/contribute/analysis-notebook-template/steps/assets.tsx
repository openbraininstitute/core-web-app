'use client';

import { Form } from 'antd';
import { useRef, useState } from 'react';

import { AssetUpload } from '@/ui/segments/contribute/shared/components/asset-upload';
import { renderLabel, RequiredFieldMarker } from '@/ui/segments/contribute/shared/helpers';
import { useContributionPipeline } from '@/ui/segments/contribute/shared/pipeline/context';

export interface INotebookFiles {
  notebook?: File;
  requirements?: File;
  zip?: File;
}

let notebookFilesStore: INotebookFiles = {};

export function getNotebookFiles(): INotebookFiles {
  return notebookFilesStore;
}

export function resetNotebookFiles(): void {
  notebookFilesStore = {};
}

const FILE_CONFIGS = [
  {
    key: 'notebook' as const,
    label: 'Jupyter Notebook',
    accept: ['.ipynb'],
    acceptLabel: 'ipynb',
    optional: false,
    validate: (file: File): string | null => {
      if (!file.name.endsWith('.ipynb')) return 'File must have .ipynb extension';
      return null;
    },
  },
  {
    key: 'requirements' as const,
    label: 'Requirements File',
    accept: ['.txt'],
    acceptLabel: 'txt',
    optional: true,
    validate: (file: File): string | null => {
      if (file.name !== 'requirements.txt') return 'File must be named requirements.txt';
      return null;
    },
  },
  {
    key: 'zip' as const,
    label: 'Supporting Files',
    accept: ['.zip'],
    acceptLabel: 'zip',
    optional: true,
    validate: (file: File): string | null => {
      if (!file.name.endsWith('.zip')) return 'File must have .zip extension';
      return null;
    },
  },
] as const;

function HiddenSentinel({
  value,
  onChange,
}: {
  value?: unknown;
  onChange?: (val: unknown) => void;
}) {
  return (
    <input
      type="hidden"
      value={value === true ? 'true' : ''}
      onChange={() => {}}
      aria-hidden
    />
  );
}

export function Assets() {
  const { notifyChange, form } = useContributionPipeline();
  const [, setTick] = useState(0);
  const sentinels = useRef<{ notebook?: true; requirements?: true; zip?: true }>({});

  const handleFileChange = (key: keyof INotebookFiles, file: File | undefined) => {
    if (file) {
      notebookFilesStore[key] = file;
      sentinels.current[key] = true;
    } else {
      delete notebookFilesStore[key];
      delete sentinels.current[key];
    }

    const snapshot = { ...sentinels.current };
    setTimeout(() => {
      form.setFieldsValue({ assets: snapshot } as any);
      notifyChange();
      setTick((n) => n + 1);
    }, 0);
  };

  return (
    <div className="h-full w-full">
      <div className="mb-5">
        <p className="text-label text-sm font-light">
          Upload the notebook file for your analysis notebook template. Requirements and supporting
          files are optional.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {FILE_CONFIGS.map((config) => (
          <div key={config.key}>
            <Form.Item
              name={['assets', config.key]}
              noStyle
              rules={
                config.optional
                  ? []
                  : [{ required: true, message: `${config.label} is required` }]
              }
            >
              <HiddenSentinel />
            </Form.Item>

            <Form.Item
              label={renderLabel(
                config.label,
                'main',
                config.optional ? undefined : RequiredFieldMarker
              )}
              className="mb-0"
            >
              <AssetUpload
                maxFiles={1}
                multiple={false}
                accept={config.accept}
                acceptLabel={config.acceptLabel}
                onValidateFile={config.validate}
                onFilesChange={(files) => {
                  const file =
                    files[0]?.file instanceof File ? (files[0].file as File) : undefined;
                  handleFileChange(config.key, file);
                }}
              />
            </Form.Item>
          </div>
        ))}
      </div>
    </div>
  );
}

