'use client';

import { CloseOutlined } from '@ant-design/icons';
import { RiDownload2Line, RiInsertRowBottom, RiUpload2Line } from '@remixicon/react';
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
  title: string | null;
  adapter: EntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  session: ImportSessionState;
  actions: EntityImportActions;
  isSubmitting: boolean;
  onClose: () => void;
  onDownloadTemplate: () => void;
  onUploadCsvFile: (file: File) => Promise<void>;
}

export function ImportShell<TPayload, TResult>({
  title,
  adapter,
  context,
  session,
  actions,
  isSubmitting,
  onClose,
  onDownloadTemplate,
  onUploadCsvFile,
}: ImportShellProps<TPayload, TResult>) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold text-primary-9">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="flex items-center justify-center gap-4"
            rounded
            type="button"
            variant="outline"
            size="md"
            onClick={onDownloadTemplate}
          >
            <span>Download CSV</span>
            <RiDownload2Line />
          </Button>
          <Button
            rounded
            className="flex items-center justify-center gap-4"
            type="button"
            variant="outline"
            size="md"
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
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-auto">
              <ImportTable
                adapter={adapter}
                context={context}
                session={session}
                actions={actions}
              />
            </div>
            <div className="shrink-0 border-t border-neutral-200 px-5 py-4">
              <div className="flex justify-end">
                <Button
                  rounded
                  type="button"
                  size="md"
                  onClick={actions.addRow}
                  className="flex items-center justify-center gap-4"
                >
                  Add row
                  <RiInsertRowBottom />
                </Button>
              </div>
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
          />
        </section>
      </div>
    </div>
  );
}
