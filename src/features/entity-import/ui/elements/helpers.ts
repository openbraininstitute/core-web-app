import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
} from '@ant-design/icons';
import { match } from 'ts-pattern';

import {
  type IImportSessionState,
  NotificationTone,
  type TNotificationTone,
} from '@/features/entity-import/core/contracts';

import type { ComponentType } from 'react';

export const CSV_BULK_UPLOAD_NOTIFICATION_ID_PREFIX = 'csv-bulk-upload';

export const CsvUploadPhase = {
  Idle: 'idle',
  Parsing: 'parsing',
  Hydrating: 'hydrating',
  PreparingRows: 'preparing-rows',
} as const;

export type TCsvUploadPhase = (typeof CsvUploadPhase)[keyof typeof CsvUploadPhase];

const CsvUploadStatusKind = {
  Loading: 'loading',
  Validating: 'validating',
} as const;

export type ICsvUploadStatus =
  | {
      kind: typeof CsvUploadStatusKind.Loading;
      title: string;
      message: string;
    }
  | {
      kind: typeof CsvUploadStatusKind.Validating;
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

export interface IImportHeaderBulkFileUploadAction {
  visible: boolean;
  isProcessing: boolean;
  pendingReferenceCount: number;
  onUploadFiles: (files: Array<File>) => Promise<void>;
}

export interface IImportHeaderProps {
  title: string | null;
  csvUploadPhase: TCsvUploadPhase;
  csvRowValidationProgress: IImportHeaderCsvRowValidationProgress;
  csvUploadNotifications: IImportHeaderNotification[];
  bulkFileUploadAction?: IImportHeaderBulkFileUploadAction | null;
  onClose: () => void;
  onDismissCsvUploadNotifications: () => void;
  onDownloadCurrentCsv: () => void;
  onDownloadGuideTemplate: () => void;
  onUploadCsvFile: (file: File) => Promise<void>;
}

export interface IImportHeaderCsvUploadUiState {
  csvUploadStatus: ICsvUploadStatus | null;
  uploadNotificationsTone: TNotificationTone;
  shouldShowBulkFileUploadAction: boolean;
  shouldShowBulkFileUploadTooltipAction: boolean;
  shouldShowTooltipCloseButton: boolean;
  shouldRenderCsvUploadTooltip: boolean;
  shouldForceCsvUploadTooltipOpen: boolean;
  csvUploadTooltipTitle: string | null;
}

type TNotificationPresentation = {
  Icon: ComponentType<{ className?: string }>;
  iconClassName: string;
};

export function resolveCsvUploadStatus(args: {
  csvUploadPhase: TCsvUploadPhase;
  csvRowValidationProgress: IImportHeaderCsvRowValidationProgress;
}): ICsvUploadStatus | null {
  const { csvUploadPhase, csvRowValidationProgress } = args;

  if (csvRowValidationProgress.active) {
    const { completedRowCount, totalRowCount } = csvRowValidationProgress;
    const percent =
      totalRowCount > 0 ? Math.min((completedRowCount / totalRowCount) * 100, 100) : 0;

    return {
      kind: CsvUploadStatusKind.Validating,
      title: 'Validating imported rows',
      message: `Validating ${completedRowCount} of ${totalRowCount} row(s)...`,
      completedRowCount,
      totalRowCount,
      percent,
    };
  }

  return match(csvUploadPhase)
    .with(CsvUploadPhase.Parsing, () => ({
      kind: CsvUploadStatusKind.Loading,
      title: 'Uploading CSV',
      message: 'Parsing CSV...',
    }))
    .with(CsvUploadPhase.Hydrating, () => ({
      kind: CsvUploadStatusKind.Loading,
      title: 'Uploading CSV',
      message: 'Preparing imported values...',
    }))
    .with(CsvUploadPhase.PreparingRows, () => ({
      kind: CsvUploadStatusKind.Loading,
      title: 'Uploading CSV',
      message: 'Preparing CSV rows...',
    }))
    .otherwise(() => null);
}

export function resolveCsvUploadNotificationTitle(
  tone: IImportSessionState['notifications'][number]['tone']
) {
  return match(tone)
    .with(NotificationTone.Error, () => 'CSV upload failed')
    .with(NotificationTone.Warning, () => 'CSV upload issue')
    .with(NotificationTone.Success, () => 'CSV upload notice')
    .otherwise(() => 'CSV upload notice');
}

export function resolveCsvUploadNotificationsTone(notifications: IImportHeaderNotification[]) {
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

export function resolveCsvUploadNotificationPresentation(
  tone: TNotificationTone
): TNotificationPresentation {
  return match(tone)
    .with(NotificationTone.Error, () => ({
      Icon: CloseCircleFilled,
      iconClassName: 'bg-red-100 text-red-600',
    }))
    .with(NotificationTone.Warning, () => ({
      Icon: ExclamationCircleFilled,
      iconClassName: 'bg-amber-100 text-amber-600',
    }))
    .with(NotificationTone.Success, () => ({
      Icon: CheckCircleFilled,
      iconClassName: 'bg-emerald-100 text-emerald-600',
    }))
    .otherwise(() => ({
      Icon: InfoCircleFilled,
      iconClassName: 'bg-sky-100 text-sky-600',
    }));
}

export function resolveImportHeaderCsvUploadUiState(args: {
  csvUploadPhase: TCsvUploadPhase;
  csvRowValidationProgress: IImportHeaderCsvRowValidationProgress;
  csvUploadNotifications: IImportHeaderNotification[];
  csvFlowBulkUploadNotifications: IImportHeaderNotification[];
  bulkFileUploadAction?: IImportHeaderBulkFileUploadAction | null;
  hasDismissedCsvUploadTooltip: boolean;
}): IImportHeaderCsvUploadUiState {
  const {
    csvUploadPhase,
    csvRowValidationProgress,
    csvUploadNotifications,
    csvFlowBulkUploadNotifications,
    bulkFileUploadAction,
    hasDismissedCsvUploadTooltip,
  } = args;
  const allCsvTooltipNotifications = [...csvUploadNotifications, ...csvFlowBulkUploadNotifications];
  const csvUploadStatus = resolveCsvUploadStatus({
    csvUploadPhase,
    csvRowValidationProgress,
  });
  const uploadNotificationsTone = resolveCsvUploadNotificationsTone(allCsvTooltipNotifications);
  const shouldShowBulkFileUploadAction = bulkFileUploadAction?.visible === true;
  const shouldShowBulkFileUploadTooltipAction =
    shouldShowBulkFileUploadAction && (bulkFileUploadAction?.pendingReferenceCount ?? 0) > 0;
  const shouldShowTooltipCloseButton =
    allCsvTooltipNotifications.length > 0 || shouldShowBulkFileUploadTooltipAction;
  const shouldRenderCsvUploadTooltip = Boolean(
    csvUploadStatus ||
      allCsvTooltipNotifications.length > 0 ||
      (!hasDismissedCsvUploadTooltip && shouldShowBulkFileUploadTooltipAction)
  );
  const shouldForceCsvUploadTooltipOpen = shouldRenderCsvUploadTooltip;
  const csvUploadTooltipTitle =
    csvUploadStatus?.title ??
    (allCsvTooltipNotifications.length > 0
      ? resolveCsvUploadNotificationTitle(uploadNotificationsTone)
      : shouldShowBulkFileUploadTooltipAction
        ? 'Bulk file upload available'
        : null);

  return {
    csvUploadStatus,
    uploadNotificationsTone,
    shouldShowBulkFileUploadAction,
    shouldShowBulkFileUploadTooltipAction,
    shouldShowTooltipCloseButton,
    shouldRenderCsvUploadTooltip,
    shouldForceCsvUploadTooltipOpen,
    csvUploadTooltipTitle,
  };
}

export type TBulkUploadTriggerSource = 'csv-flow' | 'folder-button' | null;

export function splitCsvUploadNotifications(
  notifications: IImportHeaderNotification[],
  bulkUploadTriggerSource: TBulkUploadTriggerSource
): {
  csvNotifications: IImportHeaderNotification[];
  csvFlowBulkUploadNotifications: IImportHeaderNotification[];
  folderBulkUploadNotifications: IImportHeaderNotification[];
} {
  const csvNotifications: IImportHeaderNotification[] = [];
  const bulkNotifications: IImportHeaderNotification[] = [];

  for (const notification of notifications) {
    if (notification.id.startsWith(CSV_BULK_UPLOAD_NOTIFICATION_ID_PREFIX)) {
      bulkNotifications.push(notification);
    } else {
      csvNotifications.push(notification);
    }
  }

  return {
    csvNotifications,
    csvFlowBulkUploadNotifications: bulkUploadTriggerSource === 'csv-flow' ? bulkNotifications : [],
    folderBulkUploadNotifications:
      bulkUploadTriggerSource === 'folder-button' ? bulkNotifications : [],
  };
}
