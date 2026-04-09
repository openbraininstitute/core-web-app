import { describe, expect, it, vi } from 'vitest';

import { NotificationTone } from '@/features/entity-import/core/contracts';
import {
  CsvUploadPhase,
  resolveImportHeaderCsvUploadUiState,
} from '@/features/entity-import/ui/elements/helpers';

const idleValidationProgress = {
  active: false,
  totalRowCount: 0,
  completedRowCount: 0,
};

describe('resolveImportHeaderCsvUploadUiState', () => {
  it('shows both bulk upload actions when bulk upload is available', () => {
    const state = resolveImportHeaderCsvUploadUiState({
      csvUploadPhase: CsvUploadPhase.Idle,
      csvRowValidationProgress: idleValidationProgress,
      csvUploadNotifications: [],
      csvFlowBulkUploadNotifications: [],
      bulkFileUploadAction: {
        visible: true,
        isProcessing: false,
        pendingReferenceCount: 2,
        onUploadFiles: vi.fn(async () => {}),
      },
      hasDismissedCsvUploadTooltip: false,
    });

    expect(state.shouldShowBulkFileUploadAction).toBe(true);
    expect(state.shouldShowBulkFileUploadTooltipAction).toBe(true);
    expect(state.shouldRenderCsvUploadTooltip).toBe(true);
    expect(state.shouldForceCsvUploadTooltipOpen).toBe(true);
    expect(state.shouldShowTooltipCloseButton).toBe(true);
    expect(state.csvUploadTooltipTitle).toBe('Bulk file upload available');
  });

  it('keeps the header bulk upload action visible after the tooltip is dismissed', () => {
    const state = resolveImportHeaderCsvUploadUiState({
      csvUploadPhase: CsvUploadPhase.Idle,
      csvRowValidationProgress: idleValidationProgress,
      csvUploadNotifications: [],
      csvFlowBulkUploadNotifications: [],
      bulkFileUploadAction: {
        visible: true,
        isProcessing: false,
        pendingReferenceCount: 2,
        onUploadFiles: vi.fn(async () => {}),
      },
      hasDismissedCsvUploadTooltip: true,
    });

    expect(state.shouldShowBulkFileUploadAction).toBe(true);
    expect(state.shouldShowBulkFileUploadTooltipAction).toBe(true);
    expect(state.shouldRenderCsvUploadTooltip).toBe(false);
    expect(state.shouldShowTooltipCloseButton).toBe(true);
  });

  it('keeps csv warning notifications visible when bulk upload is unavailable', () => {
    const state = resolveImportHeaderCsvUploadUiState({
      csvUploadPhase: CsvUploadPhase.Idle,
      csvRowValidationProgress: idleValidationProgress,
      csvUploadNotifications: [
        {
          id: 'warning',
          tone: NotificationTone.Warning,
          message: 'CSV parsing reported 1 issue during upload.',
        },
      ],
      csvFlowBulkUploadNotifications: [],
      bulkFileUploadAction: null,
      hasDismissedCsvUploadTooltip: false,
    });

    expect(state.shouldShowBulkFileUploadAction).toBe(false);
    expect(state.shouldShowBulkFileUploadTooltipAction).toBe(false);
    expect(state.shouldRenderCsvUploadTooltip).toBe(true);
    expect(state.shouldShowTooltipCloseButton).toBe(true);
    expect(state.csvUploadTooltipTitle).toBe('CSV upload issue');
  });
});
