'use client';

import { useRef } from 'react';

import { Button } from '@/ui/molecules/button';

import { ImportTable } from './import-table';
import { NotificationStack } from './notification-stack';
import { ValidatorPanel } from './validator-panel';

import type {
  EntityImportActions,
  EntityImportAdapter,
  EntityImportRuntimeContext,
} from '../core/adapter';
import type { ImportSessionState } from '../core/contracts';

interface ImportShellProps<TPayload, TResult> {
  adapter: EntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  session: ImportSessionState;
  actions: EntityImportActions;
  isSubmitting: boolean;
  onDownloadTemplate: () => void;
  onUploadCsvFile: (file: File) => Promise<void>;
}

export function ImportShell<TPayload, TResult>({
  adapter,
  context,
  session,
  actions,
  isSubmitting,
  onDownloadTemplate,
  onUploadCsvFile,
}: ImportShellProps<TPayload, TResult>) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
            {adapter.title}
          </h2>
          {adapter.description && (
            <p className="mt-2 text-sm text-neutral-500">{adapter.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button rounded type="button" variant="outline" size="md" onClick={onDownloadTemplate}>
            Download CSV
          </Button>
          <Button
            rounded
            type="button"
            variant="outline"
            size="md"
            onClick={() => uploadInputRef.current?.click()}
          >
            Upload CSV
          </Button>
          <Button rounded type="button" size="md" onClick={actions.addRow}>
            Add row
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
        </div>
      </div>

      <NotificationStack
        notifications={session.notifications}
        onDismiss={actions.dismissNotification}
      />

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-h-0">
          <ImportTable adapter={adapter} context={context} session={session} actions={actions} />
        </section>
        <section className="min-h-0">
          <ValidatorPanel
            adapter={adapter}
            context={context}
            session={session}
            actions={actions}
            isSubmitting={isSubmitting}
          />
        </section>
      </div>
    </div>
  );
}
