'use client';

import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { RiDownload2Line, RiUpload2Line } from '@remixicon/react';
import { Progress } from 'antd';
import { useRef } from 'react';

import { ENTITY_IMPORT_POPOVER_Z_CLASS } from '@/features/entity-import/ui/entity-import-popover';
import { ImportTable } from '@/features/entity-import/ui/import-table';
import { NotificationStack } from '@/features/entity-import/ui/notification-stack';
import { ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME } from '@/features/entity-import/ui/tooltip-styles';
import { ValidatorPanel } from '@/features/entity-import/ui/validator-panel';
import { Alert, AlertContent, AlertDescription, AlertTitle } from '@/ui/molecules/alert';
import { Button } from '@/ui/molecules/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type {
  EntityImportRuntimeContext,
  IEntityImportActions,
  IEntityImportAdapter,
  IValidatorSuggestionState,
} from '@/features/entity-import/core/adapter';
import type { IImportRunState, IImportSessionState } from '@/features/entity-import/core/contracts';

interface ImportShellProps<TPayload, TResult> {
  title: string | null;
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  session: IImportSessionState;
  actions: IEntityImportActions;
  isSubmitting: boolean;
  importRun: IImportRunState;
  csvUploadPhase: string;
  csvRowValidationProgress: {
    active: boolean;
    totalRowCount: number;
    completedRowCount: number;
  };
  csvUploadNotifications: Array<{
    id: string;
    tone: IImportSessionState['notifications'][number]['tone'];
    message: string;
  }>;
  validatorSuggestions: IValidatorSuggestionState;
  onClose: () => void;
  onDismissCsvUploadNotifications: () => void;
  onDownloadCsvTemplate: () => void;
  onDownloadCurrentCsv: () => void;
  onDownloadGuideTemplate: () => void;
  onUploadCsvFile: (file: File) => Promise<void>;
}

type CsvUploadStatus =
  | {
      kind: 'loading';
      title: string;
      message: string;
    }
  | {
      kind: 'validating';
      title: string;
      message: string;
      completedRowCount: number;
      totalRowCount: number;
      percent: number;
    };

function resolveCsvUploadStatus(args: {
  csvUploadPhase: string;
  csvRowValidationProgress: ImportShellProps<unknown, unknown>['csvRowValidationProgress'];
}): CsvUploadStatus | null {
  const { csvUploadPhase, csvRowValidationProgress } = args;

  if (csvRowValidationProgress.active) {
    const { completedRowCount, totalRowCount } = csvRowValidationProgress;
    const percent =
      totalRowCount > 0 ? Math.min((completedRowCount / totalRowCount) * 100, 100) : 0;

    return {
      kind: 'validating',
      title: 'Validating imported rows',
      message: `Validating ${completedRowCount} of ${totalRowCount} row(s)...`,
      completedRowCount,
      totalRowCount,
      percent,
    };
  }

  if (csvUploadPhase === 'parsing') {
    return {
      kind: 'loading',
      title: 'Uploading CSV',
      message: 'Parsing CSV...',
    };
  }

  if (csvUploadPhase === 'hydrating') {
    return {
      kind: 'loading',
      title: 'Uploading CSV',
      message: 'Preparing imported values...',
    };
  }

  if (csvUploadPhase === 'preparing-rows') {
    return {
      kind: 'loading',
      title: 'Uploading CSV',
      message: 'Preparing CSV rows...',
    };
  }

  return null;
}

function resolveCsvUploadNotificationVariant(
  tone: IImportSessionState['notifications'][number]['tone']
) {
  if (tone === 'error') {
    return 'destructive';
  }

  if (tone === 'warning') {
    return 'warning';
  }

  if (tone === 'success') {
    return 'success';
  }

  return 'info';
}

function resolveCsvUploadNotificationTitle(
  tone: IImportSessionState['notifications'][number]['tone']
) {
  if (tone === 'error') {
    return 'CSV upload failed';
  }

  if (tone === 'warning') {
    return 'CSV upload issue';
  }

  return 'CSV upload notice';
}

function resolveCsvUploadNotificationsTone(
  notifications: ImportShellProps<unknown, unknown>['csvUploadNotifications']
) {
  if (notifications.some((notification) => notification.tone === 'error')) {
    return 'error';
  }

  if (notifications.some((notification) => notification.tone === 'warning')) {
    return 'warning';
  }

  if (notifications.some((notification) => notification.tone === 'success')) {
    return 'success';
  }

  return 'info';
}

export function ImportShell<TPayload, TResult>({
  title,
  adapter,
  context,
  session,
  actions,
  isSubmitting,
  importRun,
  csvUploadPhase,
  csvRowValidationProgress,
  csvUploadNotifications,
  validatorSuggestions,
  onClose,
  onDismissCsvUploadNotifications,
  onDownloadCsvTemplate,
  onDownloadCurrentCsv,
  onDownloadGuideTemplate,
  onUploadCsvFile,
}: ImportShellProps<TPayload, TResult>) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const csvUploadStatus = resolveCsvUploadStatus({
    csvUploadPhase,
    csvRowValidationProgress,
  });
  const uploadNotificationsTone = resolveCsvUploadNotificationsTone(csvUploadNotifications);
  const isCsvUploadTooltipOpen = Boolean(csvUploadStatus || csvUploadNotifications.length > 0);
  const csvUploadTooltipTitle =
    csvUploadStatus?.title ??
    (csvUploadNotifications.length > 0
      ? resolveCsvUploadNotificationTitle(uploadNotificationsTone)
      : null);
  const _csvUploadTooltipMessage =
    csvUploadStatus?.message ??
    (csvUploadNotifications.length > 0 ? 'Review the upload issues below.' : null);

  return (
    <div data-entity-import-root className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">
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
          <Tooltip open={isCsvUploadTooltipOpen}>
            <TooltipTrigger asChild>
              <span className="inline-flex">
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
              </span>
            </TooltipTrigger>
            {isCsvUploadTooltipOpen ? (
              <TooltipContent
                side="bottom"
                align="end"
                sideOffset={0}
                alignOffset={0}
                arrowPadding={0}
                className={cn(
                  ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME,
                  'w-96 max-w-[calc(100vw-2rem)] p-3 text-left text-neutral-900'
                )}
                arrowClassName="bg-white border-r border-b border-neutral-200 translate-y-[calc(-50%-1px)]"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {csvUploadTooltipTitle ? (
                        <p className="text-sm font-semibold text-primary-9">
                          {csvUploadTooltipTitle}
                        </p>
                      ) : null}
                      {/* {csvUploadTooltipMessage ? (
                        <p className="mt-1 text-sm leading-5 text-neutral-600">
                          {csvUploadTooltipMessage}
                        </p>
                      ) : null} */}
                    </div>
                    {csvUploadNotifications.length > 0 ? (
                      <button
                        type="button"
                        aria-label="Close CSV upload status"
                        className="flex size-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:border-neutral-300 hover:text-primary-9"
                        onClick={onDismissCsvUploadNotifications}
                      >
                        <CloseOutlined className="text-xs" />
                      </button>
                    ) : null}
                  </div>

                  {csvUploadStatus ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3"
                    >
                      {csvUploadStatus.kind === 'validating' ? (
                        <div className="flex flex-col items-start gap-3">
                          <Progress
                            type="circle"
                            size={54}
                            percent={csvUploadStatus.percent}
                            strokeWidth={10}
                            showInfo={false}
                            strokeColor="#096dd9"
                          />
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-primary-9">
                              {`${csvUploadStatus.completedRowCount} of ${csvUploadStatus.totalRowCount} rows validated`}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {`${Math.round(csvUploadStatus.percent)}% complete`}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-primary-9">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white">
                            <LoadingOutlined className="text-base" spin />
                          </div>
                          <p className="text-sm font-medium">Working on your CSV...</p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {csvUploadNotifications.map((notification) => (
                    <Alert
                      key={notification.id}
                      appearance="light"
                      variant={resolveCsvUploadNotificationVariant(notification.tone)}
                      size="sm"
                    >
                      <AlertContent>
                        <AlertTitle>
                          {resolveCsvUploadNotificationTitle(notification.tone)}
                        </AlertTitle>
                        <AlertDescription>{notification.message}</AlertDescription>
                      </AlertContent>
                    </Alert>
                  ))}
                </div>
              </TooltipContent>
            ) : null}
          </Tooltip>
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
          <Button
            rounded
            className="flex items-center justify-center gap-4"
            type="button"
            variant="outline"
            size="md"
            onClick={onDownloadCurrentCsv}
          >
            <span>Download CSV</span>
            <RiDownload2Line />
          </Button>
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
            <div className="relative min-h-0 flex-1">
              <ImportTable
                adapter={adapter}
                context={context}
                session={session}
                actions={actions}
                importRun={importRun}
              />
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
            importRun={importRun}
            validatorSuggestions={validatorSuggestions}
          />
        </section>
      </div>
    </div>
  );
}
