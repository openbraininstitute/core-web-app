'use client';

import { RiCheckLine } from '@remixicon/react';
import { useCallback, useState } from 'react';

import { resetConfig } from '@/features/scan-config/components/hooks/schema';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { cn } from '@/utils/css-class';

import { JsonFileUpload } from './json-file-upload';
import { JsonTextareaInput } from './json-textarea-input';
import { initialImportState, useImportValidation } from './use-import-validation';
import { ValidationErrorList } from './validation-error-list';

import type { AtomsMap, ConfigSchema } from '@/features/scan-config/types';
import type { ImportMode } from './utils';

interface ImportConfigModalProps {
  open: boolean;
  onClose: () => void;
  schema: ConfigSchema;
  setAtomsMap: React.Dispatch<React.SetStateAction<AtomsMap>>;
}

const tabs: { key: ImportMode; label: string }[] = [
  { key: 'paste', label: 'Paste JSON' },
  { key: 'file', label: 'Upload File' },
];

export function ImportConfigModal({ open, onClose, schema, setAtomsMap }: ImportConfigModalProps) {
  const { state, setState, validateInput } = useImportValidation(schema);
  const [activeTab, setActiveTab] = useState<ImportMode>('paste');

  const handleClose = useCallback(() => {
    setState(initialImportState);
    setActiveTab('paste');
    onClose();
  }, [onClose, setState]);

  const handleConfirm = useCallback(() => {
    if (state.parsedConfig) {
      resetConfig(schema, state.parsedConfig, setAtomsMap);
      handleClose();
    }
  }, [state.parsedConfig, schema, setAtomsMap, handleClose]);

  const handleTextareaChange = useCallback(
    (value: string) => {
      setState((prev) => ({ ...prev, rawInput: value, mode: 'paste' }));
      validateInput(value);
    },
    [setState, validateInput]
  );

  const handleFileContent = useCallback(
    (content: string, fileName: string) => {
      setState((prev) => ({ ...prev, mode: 'file', fileName, rawInput: content }));
      validateInput(content);
    },
    [setState, validateInput]
  );

  const hasParseError = state.parseError !== null;
  const hasValidationErrors = state.validationErrors !== null && state.validationErrors.length > 0;
  const hasError = hasParseError || hasValidationErrors;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      title="Import Configuration"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={!state.isValid} onClick={handleConfirm}>
            Import
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Tab buttons */}
        <div className="flex gap-1 rounded-md bg-neutral-0 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-primary-9 text-white'
                  : 'text-neutral-6 hover:bg-neutral-1'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'paste' && (
          <JsonTextareaInput
            value={state.rawInput}
            onChange={handleTextareaChange}
            hasError={hasError}
            isValid={state.isValid}
          />
        )}

        {activeTab === 'file' && <JsonFileUpload onFileContent={handleFileContent} />}

        {/* Parse error */}
        {hasParseError && <p className="text-sm text-red-500">{state.parseError}</p>}

        {/* Validation errors */}
        {hasValidationErrors && state.validationErrors && (
          <ValidationErrorList errors={state.validationErrors} />
        )}

        {/* Success indicator */}
        {state.isValid && (
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <RiCheckLine className="size-4" />
            <span>Configuration is valid and ready to import</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
