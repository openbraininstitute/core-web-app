'use client';

import {
  CheckCircleFilled,
  CloseCircleFilled,
  CloseOutlined,
  ExclamationCircleFilled,
  InfoCircleFilled,
  LoadingOutlined,
} from '@ant-design/icons';
import { RiDownload2Line, RiFileList3Line, RiUpload2Line } from '@remixicon/react';
import { Progress } from 'antd';
import { useRef } from 'react';
import { match } from 'ts-pattern';

import {
  type IImportSessionState,
  NotificationTone,
  type TNotificationTone,
} from '@/features/entity-import/core/contracts';
import { ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME } from '@/features/entity-import/core/shared/ui';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

export const CsvUploadPhase = {
  Idle: 'idle',
  Parsing: 'parsing',
  Hydrating: 'hydrating',
  PreparingRows: 'preparing-rows',
} as const;

export type TCsvUploadPhase = (typeof CsvUploadPhase)[keyof typeof CsvUploadPhase];

const CsvUploadStatus = {
  Loading: 'loading',
  Validating: 'validating',
} as const;

type ICsvUploadStatus =
  | {
      kind: typeof CsvUploadStatus.Loading;
      title: string;
      message: string;
    }
  | {
      kind: typeof CsvUploadStatus.Validating;
      title: string;
      message: string;
      completedRowCount: number;
      totalRowCount: number;
      percent: number;
    };

export interface IImportHeaderCsvRowValidationProgress {
  active: boolean;
  totalRowCount: number;
  completedRowCount: number;
}

export interface IImportHeaderNotification {
  id: string;
  tone: IImportSessionState['notifications'][number]['tone'];
  message: string;
}

export interface IImportHeaderProps {
  title: string | null;
  templateFileName: string;
  csvUploadPhase: TCsvUploadPhase;
  csvRowValidationProgress: IImportHeaderCsvRowValidationProgress;
  csvUploadNotifications: IImportHeaderNotification[];
  onClose: () => void;
  onDismissCsvUploadNotifications: () => void;
  onDownloadCsvTemplate: () => void;
  onDownloadCurrentCsv: () => void;
  onDownloadGuideTemplate: () => void;
  onUploadCsvFile: (file: File) => Promise<void>;
}

function resolveCsvUploadStatus(args: {
  csvUploadPhase: TCsvUploadPhase;
  csvRowValidationProgress: IImportHeaderCsvRowValidationProgress;
}): ICsvUploadStatus | null {
  const { csvUploadPhase, csvRowValidationProgress } = args;

  if (csvRowValidationProgress.active) {
    const { completedRowCount, totalRowCount } = csvRowValidationProgress;
    const percent =
      totalRowCount > 0 ? Math.min((completedRowCount / totalRowCount) * 100, 100) : 0;

    return {
      kind: CsvUploadStatus.Validating,
      title: 'Validating imported rows',
      message: `Validating ${completedRowCount} of ${totalRowCount} row(s)...`,
      completedRowCount,
      totalRowCount,
      percent,
    };
  }

  return match(csvUploadPhase)
    .with(
      CsvUploadPhase.Parsing,
      () =>
        ({
          kind: CsvUploadStatus.Loading,
          title: 'Uploading CSV',
          message: 'Parsing CSV...',
        }) as ICsvUploadStatus
    )
    .with(
      CsvUploadPhase.Hydrating,
      () =>
        ({
          kind: CsvUploadStatus.Loading,
          title: 'Uploading CSV',
          message: 'Preparing imported values...',
        }) as ICsvUploadStatus
    )
    .with(
      CsvUploadPhase.PreparingRows,
      () =>
        ({
          kind: CsvUploadStatus.Loading,
          title: 'Uploading CSV',
          message: 'Preparing CSV rows...',
        }) as ICsvUploadStatus
    )
    .otherwise(() => null);
}

function resolveCsvUploadNotificationTitle(
  tone: IImportSessionState['notifications'][number]['tone']
) {
  return match(tone)
    .with(NotificationTone.Error, () => 'CSV upload failed')
    .with(NotificationTone.Warning, () => 'CSV upload issue')
    .with(NotificationTone.Success, () => 'CSV upload notice')
    .otherwise(() => 'CSV upload notice');
}

function resolveCsvUploadNotificationsTone(notifications: IImportHeaderNotification[]) {
  if (notifications.some((notification) => notification.tone === NotificationTone.Error)) {
    return NotificationTone.Error;
  }

  if (notifications.some((notification) => notification.tone === NotificationTone.Warning)) {
    return NotificationTone.Warning;
  }

  if (notifications.some((notification) => notification.tone === NotificationTone.Success)) {
    return NotificationTone.Success;
  }

  return NotificationTone.Info;
}

function resolveCsvUploadNotificationPresentation(tone: TNotificationTone) {
  return match(tone)
    .with(NotificationTone.Error, () => ({
      icon: <CloseCircleFilled className="text-xs" />,
      iconClassName: 'bg-red-100 text-red-600',
    }))
    .with(NotificationTone.Warning, () => ({
      icon: <ExclamationCircleFilled className="text-xs" />,
      iconClassName: 'bg-amber-100 text-amber-600',
    }))
    .with(NotificationTone.Success, () => ({
      icon: <CheckCircleFilled className="text-xs" />,
      iconClassName: 'bg-emerald-100 text-emerald-600',
    }))
    .otherwise(() => ({
      icon: <InfoCircleFilled className="text-xs" />,
      iconClassName: 'bg-sky-100 text-sky-600',
    }));
}

function CsvUploadNotificationItem({ notification }: { notification: IImportHeaderNotification }) {
  const presentation = resolveCsvUploadNotificationPresentation(notification.tone);

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
          {presentation.icon}
        </div>
        <p className="min-w-0 text-sm leading-5 text-neutral-700">{notification.message}</p>
      </div>
    </div>
  );
}

export function ImportHeader({
  title,
  csvUploadPhase,
  csvRowValidationProgress,
  csvUploadNotifications,
  onClose,
  onDismissCsvUploadNotifications,
  onDownloadCurrentCsv,
  onDownloadGuideTemplate,
  onUploadCsvFile,
}: IImportHeaderProps) {
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-3xl flex items-center gap-3">
        <h2 className="text-2xl font-bold text-primary-9">{title}</h2>
        <Button
          rounded
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownloadGuideTemplate}
          className="hover:bg-primary-9 hover:text-white"
        >
          <span>Guide</span>
          <RiFileList3Line />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Tooltip open={isCsvUploadTooltipOpen}>
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
                  </div>
                  {csvUploadNotifications.length > 0 ? (
                    <button
                      type="button"
                      aria-label="Close CSV upload status"
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full',
                        'border border-neutral-200 bg-white text-neutral-500 transition ',
                        'hover:border-neutral-300 hover:text-primary-9'
                      )}
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
                    {csvUploadStatus.kind === CsvUploadStatus.Validating ? (
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
                <div className="max-h-72 space-y-2 overflow-y-auto secondary-scrollbar pr-1">
                  {csvUploadNotifications.map((notification) => (
                    <CsvUploadNotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
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
          title="Download CSV"
          className={cn(
            'flex items-center justify-center gap-4 border border-neutral-200 bg-white md:w-10! lg:w-12! shadow-md',
            'hover:bg-primary-9 hover:text-white'
          )}
          type="button"
          variant="icon"
          size="responsive"
          onClick={onDownloadCurrentCsv}
        >
          <span className="sr-only">Download CSV</span>
          <RiDownload2Line />
        </Button>
        <Button
          rounded
          title="Back to contribute page"
          type="button"
          variant="ghost"
          className={cn(
            'border-none bg-transparent text-neutral-400 shadow-none md:h-10 md:w-10 lg:h-12 lg:w-12'
          )}
          onClick={onClose}
          aria-label="Back to contribute page"
        >
          <span className="sr-only">Back to contribute page</span>
          <CloseOutlined className="text-base" />
        </Button>
      </div>
    </div>
  );
}
