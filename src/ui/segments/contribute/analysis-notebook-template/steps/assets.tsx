'use client';

import { CheckCircleFilled, CloudUploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { useState, useRef, createContext, useContext } from 'react';

import { renderLabel, RequiredFieldMarker } from '@/ui/segments/contribute/shared/helpers';
import { useContributionPipeline } from '@/ui/segments/contribute/shared/pipeline/context';
import { cn } from '@/utils/css-class';

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

interface IFileDropZoneProps {
  label: string;
  description: string;
  accept: string;
  formFieldName: string[];
  assetKey: keyof INotebookFiles;
  optional?: boolean;
  validate: (file: File) => string | null;
  onChanged: () => void;
}

function FileDropZone({
  label,
  description,
  accept,
  formFieldName,
  assetKey,
  optional,
  validate,
  onChanged,
}: IFileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const form = Form.useFormInstance();
  const { notifyChange } = useContributionPipeline();
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const handleFile = (file: File) => {
    const error = validate(file);
    if (!error) {
      notebookFilesStore[assetKey] = file;
      // Only write a plain boolean sentinel into the form store —
      // never the File itself — so Form.useWatch stays serializable
      form.setFieldValue(formFieldName, true);
      setCurrentFile(file);
      notifyChange();
      onChanged();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    delete notebookFilesStore[assetKey];
    form.setFieldValue(formFieldName, undefined);
    setCurrentFile(null);
    notifyChange();
    onChanged();
  };

  return (
    <div
      className={cn(
        'border-neutral-1 shadow-bnb relative rounded-xl border transition-colors',
        currentFile
          ? 'border-teal-500 bg-teal-50/30'
          : 'hover:border-primary-6 cursor-pointer'
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !currentFile && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
      />

      <div className="flex items-center gap-4 p-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            currentFile ? 'bg-teal-100' : 'bg-primary-8/10'
          )}
        >
          {currentFile ? (
            <CheckCircleFilled className="text-teal-500 text-xl" />
          ) : (
            <CloudUploadOutlined className="text-primary-8 text-xl" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-semibold', currentFile ? 'text-teal-700' : 'text-primary-8')}>
            {label}
          </p>
          {currentFile ? (
            <p className="text-primary-9 truncate text-xs font-light mt-0.5">{currentFile.name}</p>
          ) : (
            <p className="text-label text-xs mt-0.5">{description}</p>
          )}
        </div>

        {currentFile ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-red-400 hover:text-red-600 shrink-0 transition-colors p-1"
            aria-label="Remove file"
          >
            <DeleteOutlined />
          </button>
        ) : (
          <span className={cn(
            'shrink-0 rounded-full border px-3 py-1 text-xs',
            optional
              ? 'text-neutral-4 border-neutral-3'
              : 'text-primary-6 border-primary-6'
          )}>
            Browse
          </span>
        )}
      </div>
    </div>
  );
}

export function Assets() {
  const form = Form.useFormInstance();
  // Dummy state just to force re-render when files change, so the
  // Form.Item validation rules re-evaluate
  const [, setTick] = useState(0);
  const rerender = () => setTick((n) => n + 1);

  const fileConfigs = [
    {
      key: 'notebook' as const,
      label: 'Jupyter Notebook',
      description: 'Drag & drop or browse for a .ipynb file',
      accept: '.ipynb',
      formFieldName: ['assets', 'notebook'],
      optional: false,
      validate: (file: File) => {
        if (!file.name.endsWith('.ipynb')) return 'File must have .ipynb extension';
        return null;
      },
    },
    {
      key: 'requirements' as const,
      label: 'Requirements File',
      description: 'Drag & drop or browse for requirements.txt (optional)',
      accept: '.txt',
      formFieldName: ['assets', 'requirements'],
      optional: true,
      validate: (file: File) => {
        if (file.name !== 'requirements.txt') return 'File must be named requirements.txt';
        return null;
      },
    },
    {
      key: 'zip' as const,
      label: 'Supporting Files',
      description: 'Drag & drop or browse for a .zip archive (optional)',
      accept: '.zip',
      formFieldName: ['assets', 'zip'],
      optional: true,
      validate: (file: File) => {
        if (!file.name.endsWith('.zip')) return 'File must have .zip extension';
        return null;
      },
    },
  ];

  return (
    <div className="h-full w-full">
      <div className="mb-5">
        <p className="text-label text-sm font-light">
          Upload the notebook file for your analysis notebook template. Requirements and supporting files are optional.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {fileConfigs.map((config) => (
          <Form.Item
            key={config.key}
            name={config.formFieldName}
            label={renderLabel(config.label, 'main', config.optional ? undefined : RequiredFieldMarker)}
            rules={
              config.optional
                ? []
                : [{ required: true, message: `${config.label} is required` }]
            }
            className="mb-0"
          >
            <FileDropZone
              label={config.label}
              description={config.description}
              accept={config.accept}
              formFieldName={config.formFieldName}
              assetKey={config.key}
              optional={config.optional}
              validate={config.validate}
              onChanged={rerender}
            />
          </Form.Item>
        ))}
      </div>
    </div>
  );
}
