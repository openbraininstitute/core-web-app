'use client';

import { useRef, useState } from 'react';

import { ImportHeaderActionButtons } from '@/features/entity-import/ui/elements/header/action-buttons';
import { ImportHeaderCsvUploadControl } from '@/features/entity-import/ui/elements/header/csv-upload-control';
import { ImportHeaderTitleSection } from '@/features/entity-import/ui/elements/header/title-section';
import { ImportHeaderUploadInputs } from '@/features/entity-import/ui/elements/header/upload-inputs';
import {
  type IImportHeaderProps,
  resolveImportHeaderCsvUploadUiState,
} from '@/features/entity-import/ui/elements/helpers';

export {
  CsvUploadPhase,
  type IImportHeaderBulkFileUploadAction,
  type IImportHeaderCsvRowValidationProgress,
  type IImportHeaderNotification,
  type IImportHeaderProps,
  type TCsvUploadPhase,
} from '@/features/entity-import/ui/elements/helpers';

export function ImportHeader({
  title,
  csvUploadPhase,
  csvRowValidationProgress,
  csvUploadNotifications,
  bulkFileUploadAction,
  onClose,
  onDismissCsvUploadNotifications,
  onDownloadCurrentCsv,
  onDownloadGuideTemplate,
  onUploadCsvFile,
}: IImportHeaderProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const bulkUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isCsvUploadTooltipInteractiveOpen, setIsCsvUploadTooltipInteractiveOpen] = useState(false);
  const [hasDismissedCsvUploadTooltip, setHasDismissedCsvUploadTooltip] = useState(false);

  const csvUploadUiState = resolveImportHeaderCsvUploadUiState({
    csvUploadPhase,
    csvRowValidationProgress,
    csvUploadNotifications,
    bulkFileUploadAction,
    hasDismissedCsvUploadTooltip,
  });
  const isCsvUploadTooltipOpen =
    csvUploadUiState.shouldRenderCsvUploadTooltip &&
    (csvUploadUiState.shouldForceCsvUploadTooltipOpen || isCsvUploadTooltipInteractiveOpen);

  const resetCsvUploadTooltipSession = () => {
    setHasDismissedCsvUploadTooltip(false);
    setIsCsvUploadTooltipInteractiveOpen(false);
  };

  const handleOpenCsvUploadDialog = () => {
    resetCsvUploadTooltipSession();
    uploadInputRef.current?.click();
  };

  const handleOpenBulkUploadDialog = () => {
    bulkUploadInputRef.current?.click();
  };

  const handleCsvUploadTooltipOpenChange = (nextOpen: boolean) => {
    if (csvUploadUiState.shouldForceCsvUploadTooltipOpen) {
      setIsCsvUploadTooltipInteractiveOpen(false);
      return;
    }

    setIsCsvUploadTooltipInteractiveOpen(nextOpen);
  };

  const handleCloseCsvUploadTooltip = () => {
    setHasDismissedCsvUploadTooltip(true);
    setIsCsvUploadTooltipInteractiveOpen(false);
    onDismissCsvUploadNotifications();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <ImportHeaderTitleSection title={title} onDownloadGuideTemplate={onDownloadGuideTemplate} />
      <div className="flex flex-wrap items-center gap-3">
        <ImportHeaderCsvUploadControl
          csvUploadPhase={csvUploadPhase}
          csvUploadNotifications={csvUploadNotifications}
          bulkFileUploadAction={bulkFileUploadAction}
          uiState={csvUploadUiState}
          isCsvUploadTooltipOpen={isCsvUploadTooltipOpen}
          onCsvUploadTooltipOpenChange={handleCsvUploadTooltipOpenChange}
          onOpenCsvUploadDialog={handleOpenCsvUploadDialog}
          onOpenBulkUploadDialog={handleOpenBulkUploadDialog}
          onCloseCsvUploadTooltip={handleCloseCsvUploadTooltip}
        />
        <ImportHeaderUploadInputs
          uploadInputRef={uploadInputRef}
          bulkUploadInputRef={bulkUploadInputRef}
          onPrepareCsvUpload={resetCsvUploadTooltipSession}
          onUploadCsvFile={onUploadCsvFile}
          onUploadBulkFiles={bulkFileUploadAction?.onUploadFiles}
        />
        <ImportHeaderActionButtons
          shouldShowBulkFileUploadAction={csvUploadUiState.shouldShowBulkFileUploadAction}
          isBulkFileUploadProcessing={bulkFileUploadAction?.isProcessing ?? false}
          onOpenBulkUploadDialog={handleOpenBulkUploadDialog}
          onDownloadCurrentCsv={onDownloadCurrentCsv}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
