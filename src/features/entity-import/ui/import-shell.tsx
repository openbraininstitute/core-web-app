'use client';

import { useCallback, useState } from 'react';

import { ImportHeader, type TCsvUploadPhase } from '@/features/entity-import/ui/elements/header';
import { ImportTable } from '@/features/entity-import/ui/import-table';
import { NotificationStack } from '@/features/entity-import/ui/notification-stack';
import { ValidatorPanel } from '@/features/entity-import/ui/validator-panel';
import { cn } from '@/utils/css-class';

import type {
  IEntityImportActions,
  IEntityImportAdapter,
  IEntityImportRuntimeContext,
  IValidatorPreviewState,
  IValidatorSuggestionState,
} from '@/features/entity-import/core/adapter';
import type { IImportRunState, IImportSessionState } from '@/features/entity-import/core/contracts';
import type { TValidatorFieldStatus } from '@/features/entity-import/core/summary';

interface IImportShellProps<TPayload, TResult> {
  title: string | null;
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: IEntityImportRuntimeContext;
  session: IImportSessionState;
  actions: IEntityImportActions;
  isSubmitting: boolean;
  importRun: IImportRunState;
  validatorPreview: IValidatorPreviewState;
  csvUploadPhase: TCsvUploadPhase;
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
  fieldStatusMap: Record<string, TValidatorFieldStatus>;
  rowsSummaryStatus: TValidatorFieldStatus;
  onClose: () => void;
  onDismissCsvUploadNotifications: () => void;
  onDownloadCsvTemplate: () => void;
  onDownloadCurrentCsv: () => void;
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
  importRun,
  validatorPreview,
  csvUploadPhase,
  csvRowValidationProgress,
  csvUploadNotifications,
  validatorSuggestions,
  fieldStatusMap,
  rowsSummaryStatus,
  onClose,
  onDismissCsvUploadNotifications,
  onDownloadCsvTemplate,
  onDownloadCurrentCsv,
  onDownloadGuideTemplate,
  onUploadCsvFile,
}: IImportShellProps<TPayload, TResult>) {
  const [validatorCollapsed, setValidatorCollapsed] = useState(false);

  const toggleValidatorCollapsed = useCallback(() => {
    setValidatorCollapsed((prev) => !prev);
  }, []);

  const showExpandedValidator = !validatorCollapsed;

  return (
    <div data-entity-import-root className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">
      <NotificationStack
        notifications={session.notifications}
        onDismiss={actions.onDismissFeatureNotification}
      />

      <div
        className={cn(
          'grid min-h-0 flex-1 overflow-hidden gap-2 transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-200 motion-reduce:ease-out',
          showExpandedValidator
            ? 'grid-cols-[minmax(0,1fr)_24rem]'
            : 'grid-cols-[minmax(0,1fr)_3.5rem]'
        )}
      >
        <section id="import-shell" className="min-h-0 overflow-hidden bg-background">
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
            <div className="relative min-h-0 flex-1 flex flex-col gap-5">
              <ImportHeader
                title={title}
                templateFileName={adapter.templateFileName}
                csvUploadPhase={csvUploadPhase}
                csvRowValidationProgress={csvRowValidationProgress}
                csvUploadNotifications={csvUploadNotifications}
                onClose={onClose}
                onDismissCsvUploadNotifications={onDismissCsvUploadNotifications}
                onDownloadCsvTemplate={onDownloadCsvTemplate}
                onDownloadCurrentCsv={onDownloadCurrentCsv}
                onDownloadGuideTemplate={onDownloadGuideTemplate}
                onUploadCsvFile={onUploadCsvFile}
              />
              <ImportTable
                adapter={adapter}
                context={context}
                session={session}
                actions={actions}
                importRun={importRun}
                validatorPreview={validatorPreview}
              />
            </div>
          </div>
        </section>
        <section id="validator-panel" className="min-h-0 w-full flex items-center justify-end">
          <ValidatorPanel
            adapter={adapter}
            context={context}
            session={session}
            actions={actions}
            isSubmitting={isSubmitting}
            importRun={importRun}
            validatorPreview={validatorPreview}
            validatorSuggestions={validatorSuggestions}
            fieldStatusMap={fieldStatusMap}
            rowsSummaryStatus={rowsSummaryStatus}
            collapsed={validatorCollapsed}
            onToggleCollapsed={toggleValidatorCollapsed}
          />
        </section>
      </div>
    </div>
  );
}
