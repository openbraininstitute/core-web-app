'use client';

import { Form } from 'antd';
import { useRef, useState } from 'react';

import { AssetUpload } from '@/ui/segments/contribute/shared/components/asset-upload';
import { RequiredFieldMarker, renderLabel } from '@/ui/segments/contribute/shared/helpers';
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
    description: undefined as string | undefined,
    accept: ['.ipynb', '.IPYNB'],
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
    description:
      "A requirements.txt file is a plain-text document used to manage a project's Python dependencies with pip. It lists specific packages and their version requirements, allowing users to replicate an entire environment." as
        | string
        | undefined,
    accept: ['.txt', '.TXT'],
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
    description:
      'A zip archive containing files that support functionality. These can be code (.py) to be used in the notebook, images to be embedded, or data to be loaded. The archive will be extracted as-is at the location of the notebook file.' as
        | string
        | undefined,
    accept: ['.zip', '.ZIP'],
    acceptLabel: 'zip',
    optional: true,
    validate: (file: File): string | null => {
      if (!file.name.endsWith('.zip')) return 'File must have .zip extension';
      return null;
    },
  },
];

function HiddenSentinel({ value }: { value?: unknown; onChange?: (val: unknown) => void }) {
  return (
    <input type="hidden" value={value === true ? 'true' : ''} onChange={() => {}} aria-hidden />
  );
}

export function Assets() {
  const { form } = useContributionPipeline();
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
      setTick((n) => n + 1);
    }, 0);
  };

  return (
    <div className="h-full w-full">
      <div className="mb-5">
        <p className="text-black text-sm font-light">
          Upload the notebook file for your analysis notebook template. Requirements and supporting
          files are optional.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {FILE_CONFIGS.map((config) => (
          <div key={config.key}>
            <Form.Item
              name={['assets', config.key]}
              label={renderLabel(
                config.label,
                'main',
                config.optional ? undefined : RequiredFieldMarker
              )}
              rules={
                config.optional ? [] : [{ required: true, message: `${config.label} is required` }]
              }
              className="mb-0"
            >
              <HiddenSentinel />
            </Form.Item>

            {config.description && (
              <p className="-mt-3 mb-2 text-xs font-light text-black">{config.description}</p>
            )}

            <AssetUpload
              maxFiles={1}
              multiple={false}
              accept={config.accept}
              acceptLabel={config.acceptLabel}
              onValidateFile={config.validate}
              onFilesChange={(files) => {
                const file = files[0]?.file instanceof File ? (files[0].file as File) : undefined;
                handleFileChange(config.key, file);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
