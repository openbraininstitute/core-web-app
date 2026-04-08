import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { RiUpload2Line } from '@remixicon/react';
import { Progress } from 'antd';

import { ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME } from '@/features/entity-import/core/shared/ui';
import {
  CsvUploadPhase,
  type ICsvUploadStatus,
  type IImportHeaderBulkFileUploadAction,
  type IImportHeaderCsvUploadUiState,
  type IImportHeaderNotification,
  resolveCsvUploadNotificationPresentation,
  type TCsvUploadPhase,
} from '@/features/entity-import/ui/elements/helpers';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

interface IImportHeaderCsvUploadControlProps {
  csvUploadPhase: TCsvUploadPhase;
  csvUploadNotifications: IImportHeaderNotification[];
  bulkFileUploadAction?: IImportHeaderBulkFileUploadAction | null;
  uiState: IImportHeaderCsvUploadUiState;
  isCsvUploadTooltipOpen: boolean;
  onCsvUploadTooltipOpenChange: (nextOpen: boolean) => void;
  onOpenCsvUploadDialog: () => void;
  onOpenBulkUploadDialog: () => void;
  onCloseCsvUploadTooltip: () => void;
}

function CsvUploadNotificationItem({ notification }: { notification: IImportHeaderNotification }) {
  const presentation = resolveCsvUploadNotificationPresentation(notification.tone);
  const { Icon } = presentation;

  return (
    <div
      data-testid="csv-upload-notification"
      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
            presentation.iconClassName
          )}
        >
          <Icon className="text-xs" />
        </div>
        <p className="min-w-0 text-sm leading-5 text-neutral-700">{notification.message}</p>
      </div>
    </div>
  );
}

function CsvUploadStatusCard({ status }: { status: ICsvUploadStatus }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3"
    >
      {status.kind === 'validating' ? (
        <div className="flex flex-col items-start gap-3">
          <Progress
            type="circle"
            size={54}
            percent={status.percent}
            strokeWidth={10}
            showInfo={false}
            strokeColor="#096dd9"
          />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-primary-9">
              {`${status.completedRowCount} of ${status.totalRowCount} rows validated`}
            </p>
            <p className="text-xs text-neutral-500">{`${Math.round(status.percent)}% complete`}</p>
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
  );
}

function BulkFileUploadTooltipAction({
  bulkFileUploadAction,
  onOpenBulkUploadDialog,
}: {
  bulkFileUploadAction: IImportHeaderBulkFileUploadAction;
  onOpenBulkUploadDialog: () => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-primary-9">
            {bulkFileUploadAction.pendingReferenceCount === 1
              ? '1 file reference from your CSV is ready for bulk upload.'
              : `${bulkFileUploadAction.pendingReferenceCount} file references from your CSV are ready for bulk upload.`}
          </p>
          <p className="text-xs leading-5 text-neutral-500 py-1.5">
            Choose the folder that contains the files from your CSV. We&apos;ll match the file names
            automatically and report anything we skip.
          </p>
        </div>
        <Button
          rounded
          type="button"
          variant="default"
          size="sm"
          className="w-full justify-center"
          disabled={bulkFileUploadAction.isProcessing}
          onClick={onOpenBulkUploadDialog}
        >
          {bulkFileUploadAction.isProcessing
            ? 'Matching files from the selected folder...'
            : 'Select a folder'}
        </Button>
      </div>
    </div>
  );
}

export function ImportHeaderCsvUploadControl({
  csvUploadPhase,
  csvUploadNotifications,
  bulkFileUploadAction,
  uiState,
  isCsvUploadTooltipOpen,
  onCsvUploadTooltipOpenChange,
  onOpenCsvUploadDialog,
  onOpenBulkUploadDialog,
  onCloseCsvUploadTooltip,
}: IImportHeaderCsvUploadControlProps) {
  return (
    <Tooltip open={isCsvUploadTooltipOpen} onOpenChange={onCsvUploadTooltipOpenChange}>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            rounded
            title="Upload CSV"
            className={cn(
              'flex items-center justify-center gap-4 shadow-md',
              'hover:bg-primary-9 hover:text-white'
            )}
            type="button"
            variant="outline"
            size="responsive"
            disabled={csvUploadPhase !== CsvUploadPhase.Idle}
            onClick={onOpenCsvUploadDialog}
          >
            <span>Upload CSV</span>
            <RiUpload2Line />
          </Button>
        </span>
      </TooltipTrigger>
      {uiState.shouldRenderCsvUploadTooltip ? (
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
                {uiState.csvUploadTooltipTitle ? (
                  <p className="text-sm font-semibold text-primary-9">
                    {uiState.csvUploadTooltipTitle}
                  </p>
                ) : null}
              </div>
              {uiState.shouldShowTooltipCloseButton ? (
                <button
                  type="button"
                  aria-label="Close CSV upload status"
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full',
                    'border border-neutral-200 bg-white text-neutral-500 transition',
                    'hover:border-neutral-300 hover:text-primary-9'
                  )}
                  onClick={onCloseCsvUploadTooltip}
                >
                  <CloseOutlined className="text-xs" />
                </button>
              ) : null}
            </div>

            {uiState.csvUploadStatus ? (
              <CsvUploadStatusCard status={uiState.csvUploadStatus} />
            ) : null}

            {uiState.shouldShowBulkFileUploadTooltipAction && bulkFileUploadAction ? (
              <BulkFileUploadTooltipAction
                bulkFileUploadAction={bulkFileUploadAction}
                onOpenBulkUploadDialog={onOpenBulkUploadDialog}
              />
            ) : null}

            <div className="max-h-72 space-y-2 overflow-y-auto secondary-scrollbar pr-1">
              {csvUploadNotifications.map((notification) => (
                <CsvUploadNotificationItem key={notification.id} notification={notification} />
              ))}
            </div>
          </div>
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}
