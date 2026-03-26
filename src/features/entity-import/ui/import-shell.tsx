'use client';

import { CloseOutlined } from '@ant-design/icons';
import { RiDownload2Line, RiUpload2Line } from '@remixicon/react';
import { useRef } from 'react';

import { ENTITY_IMPORT_POPOVER_Z_CLASS } from '@/features/entity-import/ui/entity-import-popover';
import { ImportTable } from '@/features/entity-import/ui/import-table';
import { NotificationStack } from '@/features/entity-import/ui/notification-stack';
import { ValidatorPanel } from '@/features/entity-import/ui/validator-panel';
import { Button } from '@/ui/molecules/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { cn } from '@/utils/css-class';

import type {
  EntityImportRuntimeContext,
  IEntityImportActions,
  IEntityImportAdapter,
  IValidatorSuggestionState,
} from '@/features/entity-import/core/adapter';
import type { IImportSessionState } from '@/features/entity-import/core/contracts';

interface ImportShellProps<TPayload, TResult> {
  title: string | null;
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  session: IImportSessionState;
  actions: IEntityImportActions;
  isSubmitting: boolean;
  csvUploadPhase: string;
  csvRowValidationProgress: {
    active: boolean;
    totalRowCount: number;
    completedRowCount: number;
  };
  validatorSuggestions: IValidatorSuggestionState;
  onClose: () => void;
  onDownloadCsvTemplate: () => void;
  onDownloadGuideTemplate: () => void;
  onUploadCsvFile: (file: File) => Promise<void>;
}

export function ImportShell<TPayload, TResult>({
  title,
  adapter,
  context,
  session,
  actions,
  isSubmitting,
  csvUploadPhase,
  csvRowValidationProgress,
  validatorSuggestions,
  onClose,
  onDownloadCsvTemplate,
  onDownloadGuideTemplate,
  onUploadCsvFile,
}: ImportShellProps<TPayload, TResult>) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const csvUploadMessage =
    csvUploadPhase === 'parsing'
      ? 'Parsing CSV...'
      : csvUploadPhase === 'hydrating' || csvUploadPhase === 'preparing-rows'
        ? 'Preparing CSV rows...'
        : null;
  const csvValidationMessage = csvRowValidationProgress.active
    ? `Validating ${csvRowValidationProgress.completedRowCount} of ${csvRowValidationProgress.totalRowCount} row(s)...`
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold text-primary-9">{title}</h2>
          <div className="mt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button rounded type="button" variant="outline" size="md" className="gap-3">
                  <span>{adapter.templateFileName}</span>
                  <RiDownload2Line />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className={cn(ENTITY_IMPORT_POPOVER_Z_CLASS, 'bg-white border border-neutral-200')}
                style={{
                  width: 'var(--radix-dropdown-menu-trigger-width)',
                }}
              >
                <DropdownMenuItem
                  className="text-primary-9 w-full cursor-pointer h-9"
                  onSelect={onDownloadCsvTemplate}
                >
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-primary-9 w-full cursor-pointer h-9"
                  onSelect={onDownloadGuideTemplate}
                >
                  Download Guide
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            rounded
            className="flex items-center justify-center gap-4"
            type="button"
            variant="outline"
            size="md"
            disabled={csvUploadPhase !== 'idle'}
            onClick={() => uploadInputRef.current?.click()}
          >
            <span>Upload CSV</span>
            <RiUpload2Line />
          </Button>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) {
                void onUploadCsvFile(file);
                event.currentTarget.value = '';
              }
            }}
          />
          <Button rounded type="button" variant="icon" size="md" onClick={onClose}>
            <CloseOutlined />
          </Button>
        </div>
      </div>

      <NotificationStack
        notifications={session.notifications}
        onDismiss={actions.dismissNotification}
      />

      <div className="grid min-h-0 flex-1 overflow-hidden gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-h-0 overflow-hidden bg-white">
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
            {csvValidationMessage ? (
              <div className="mx-4 mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-primary-9">
                {csvValidationMessage}
              </div>
            ) : null}
            <div className="relative min-h-0 flex-1">
              <ImportTable
                adapter={adapter}
                context={context}
                session={session}
                actions={actions}
              />
              {csvUploadMessage ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 px-6 text-center">
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm font-semibold text-primary-9 shadow-sm"
                  >
                    {csvUploadMessage}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
        <section className="min-h-0">
          <ValidatorPanel
            adapter={adapter}
            context={context}
            session={session}
            actions={actions}
            isSubmitting={isSubmitting}
            validatorSuggestions={validatorSuggestions}
          />
        </section>
      </div>
    </div>
  );
}
