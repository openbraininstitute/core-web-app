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
  EntityImportActions,
  EntityImportAdapter,
  EntityImportRuntimeContext,
} from '@/features/entity-import/core/adapter';
import type { IImportSessionState } from '@/features/entity-import/core/contracts';

interface ImportShellProps<TPayload, TResult> {
  title: string | null;
  adapter: EntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  session: IImportSessionState;
  actions: EntityImportActions;
  isSubmitting: boolean;
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
  onClose,
  onDownloadCsvTemplate,
  onDownloadGuideTemplate,
  onUploadCsvFile,
}: ImportShellProps<TPayload, TResult>) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

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
