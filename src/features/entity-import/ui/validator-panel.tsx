'use client';

import {
  CheckOutlined,
  ExclamationCircleOutlined,
  LeftOutlined,
  LoadingOutlined,
  MinusOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { RiFolderUploadFill, RiInfoI, RiSearchLine, RiUpload2Line } from '@remixicon/react';
import { DatePicker } from 'antd';
import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { match } from 'ts-pattern';

import {
  ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE,
  ValidatorManualApplyMode,
} from '@/features/entity-import/core/adapter';
import {
  CellStatus,
  ENTITY_IMPORT_ALL_COLUMNS,
  type IImportRowState,
  type IImportRunState,
  type IImportSessionState,
  ImportInputType,
  ImportRunPhase,
  type ISuggestion,
  RemoteValidationStatus,
  RowStatus,
} from '@/features/entity-import/core/contracts';
import {
  buildFileAcceptValue,
  getImportFileInputMultiple,
  toFileArray,
} from '@/features/entity-import/core/file-field';
import {
  formatImportDateDisplayValue,
  getRowSubmissionValues,
  importDatePickerChangeToRawValue,
  parseImportDatePickerValue,
} from '@/features/entity-import/core/helpers';
import {
  ENTITY_IMPORT_PANEL_SELECT_TRIGGER_CLASSNAME,
  ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME,
  ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
  ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME,
  getEntityImportSelectLabel,
} from '@/features/entity-import/core/shared/ui';
import {
  type TValidatorFieldStatus,
  ValidatorFieldStatus,
} from '@/features/entity-import/core/summary';
import { Alert, AlertContent, AlertDescription } from '@/ui/molecules/alert';
import { Button } from '@/ui/molecules/button';
import { Card, CardContent } from '@/ui/molecules/card';
import { Input } from '@/ui/molecules/input';
import { Textarea } from '@/ui/molecules/input/text-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type {
  IAdapterFieldDefinition,
  IEntityImportActions,
  IEntityImportAdapter,
  IEntityImportRuntimeContext,
  IValidatorDraftValue,
  IValidatorPreviewState,
  IValidatorSuggestionState,
} from '@/features/entity-import/core/adapter';

interface IValidatorPanelProps<TPayload, TResult> {
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: IEntityImportRuntimeContext;
  session: IImportSessionState;
  actions: IEntityImportActions;
  isSubmitting: boolean;
  importRun: IImportRunState;
  validatorPreview: IValidatorPreviewState;
  validatorSuggestions: IValidatorSuggestionState;
  fieldStatusMap: Record<string, TValidatorFieldStatus>;
  rowsSummaryStatus: TValidatorFieldStatus;
  collapsed: boolean;
  hoverExpanded: boolean;
  onToggleCollapsed: () => void;
  onHoverExpandedChange: (expanded: boolean) => void;
}

const VALIDATOR_SUGGESTION_SKELETON_KEYS = Array.from(
  { length: ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE },
  (_, index) => `validator-suggestion-skeleton-${index}`
);

function resolveActiveRow(session: IImportSessionState): IImportRowState | null {
  if (session.validatorSelection.rowId) {
    return session.rows.find((row) => row.id === session.validatorSelection.rowId) ?? null;
  }
  return null;
}

function resolveActiveField<TPayload, TResult>(
  adapter: IEntityImportAdapter<TPayload, TResult>,
  session: IImportSessionState
): IAdapterFieldDefinition | null {
  if (
    session.validatorSelection.fieldPath &&
    session.validatorSelection.fieldPath !== ENTITY_IMPORT_ALL_COLUMNS
  ) {
    return (
      adapter.fields.find((field) => field.path === session.validatorSelection.fieldPath) ?? null
    );
  }
  return null;
}

function resolveRowStatus<TPayload, TResult>(
  adapter: IEntityImportAdapter<TPayload, TResult>,
  row: IImportRowState
): TValidatorFieldStatus {
  const hasOptionalProblem = adapter.fields.some((field) => {
    if (field.required) {
      return false;
    }

    const cell = row.cells[field.path];
    return cell.status === CellStatus.Invalid || cell.status === CellStatus.Disabled;
  });

  if (row.rowStatus === RowStatus.Invalid) {
    return ValidatorFieldStatus.Warning;
  }

  if (row.rowStatus === RowStatus.Valid && hasOptionalProblem) {
    return ValidatorFieldStatus.Idle;
  }

  if (row.rowStatus === RowStatus.Valid) {
    return ValidatorFieldStatus.Valid;
  }

  return ValidatorFieldStatus.Idle;
}

function ValidationStatusIcon({ status }: { status: TValidatorFieldStatus }) {
  return match(status)
    .with(ValidatorFieldStatus.Valid, () => (
      <CheckOutlined className="text-base text-green-main!" />
    ))
    .with(ValidatorFieldStatus.Warning, () => (
      <ExclamationCircleOutlined className="text-base text-warning!" />
    ))
    .otherwise(() => <span className="inline-flex size-4" />);
}

function resolveImportRunProgressPercent(importRun: IImportRunState): number {
  if (importRun.totalRowCount === 0) {
    return 0;
  }

  return Math.min((importRun.completedRowCount / importRun.totalRowCount) * 100, 100);
}

const SubmitButtonTone = {
  Idle: 'idle',
  Running: 'running',
  Success: 'success',
  Partial: 'partial',
  Failed: 'failed',
} as const;

type SubmitButtonTone = (typeof SubmitButtonTone)[keyof typeof SubmitButtonTone];

function resolveSubmitButtonTone(importRun: IImportRunState): SubmitButtonTone {
  if (importRun.phase === ImportRunPhase.Running) {
    return SubmitButtonTone.Running;
  }

  if (importRun.phase === ImportRunPhase.Completed) {
    if (importRun.failedRowCount === 0) {
      return SubmitButtonTone.Success;
    }

    if (importRun.succeededRowCount === 0) {
      return SubmitButtonTone.Failed;
    }

    return SubmitButtonTone.Partial;
  }

  return SubmitButtonTone.Idle;
}

function resolveSubmitButtonLabel<TPayload, TResult>(
  adapter: IEntityImportAdapter<TPayload, TResult>,
  session: IImportSessionState,
  importRun: IImportRunState
): string {
  if (importRun.phase === ImportRunPhase.Running) {
    const rowLabel = importRun.totalRowCount === 1 ? 'row' : 'rows';
    return `Importing ${importRun.completedRowCount}/${importRun.totalRowCount} ${rowLabel}`;
  }

  if (importRun.phase === ImportRunPhase.Completed) {
    const rowLabel = importRun.totalRowCount === 1 ? 'row' : 'rows';
    return `Imported ${importRun.succeededRowCount}/${importRun.totalRowCount} ${rowLabel}`;
  }

  return `${adapter.submitLabel ?? 'Import'} ${session.rows.length} row(s)`;
}

function resolveImportFailureSummary(importRun: IImportRunState): string {
  return importRun.failedRowCount === 1
    ? '1 row failed to import'
    : `${importRun.failedRowCount} rows failed to import`;
}

function resolveSubmitButtonFillClassName(tone: SubmitButtonTone): string {
  return match(tone)
    .with(SubmitButtonTone.Success, () => 'bg-emerald-500')
    .with(SubmitButtonTone.Failed, () => 'bg-amber-500')
    .otherwise(() => 'bg-primary-8');
}

const SUBMIT_BUTTON_IDLE_CHROME = [
  'border-primary-8/20 text-primary-9',
  'hover:border-primary-8 hover:bg-white hover:text-primary-9 active:bg-white',
  'disabled:bg-white disabled:text-primary-9',
] as const;

const SUBMIT_BUTTON_CHROME_CLASSNAME: Record<SubmitButtonTone, readonly string[]> = {
  [SubmitButtonTone.Success]: [
    'border-emerald-500/30 text-emerald-900',
    'hover:border-emerald-500 hover:bg-white hover:text-emerald-900 active:bg-white',
    'disabled:bg-white disabled:text-emerald-900',
  ],
  [SubmitButtonTone.Failed]: [
    'border-amber-500/30 text-amber-950',
    'hover:border-amber-500 hover:bg-white hover:text-amber-950 active:bg-white',
    'disabled:bg-white disabled:text-amber-950',
  ],
  [SubmitButtonTone.Idle]: SUBMIT_BUTTON_IDLE_CHROME,
  [SubmitButtonTone.Running]: SUBMIT_BUTTON_IDLE_CHROME,
  [SubmitButtonTone.Partial]: SUBMIT_BUTTON_IDLE_CHROME,
};

function createValidatorDraftValue(
  cell: IImportSessionState['rows'][number]['cells'][string]
): IValidatorDraftValue {
  return {
    rawValue: cell.rawValue,
    displayValue: cell.displayValue ?? null,
    parsedValue: cell.parsedValue,
  };
}

function doesDraftMatchSuggestion(
  draftValue: IValidatorDraftValue,
  suggestion: ISuggestion | null
): suggestion is ISuggestion {
  if (!suggestion) {
    return false;
  }

  return (
    draftValue.rawValue === suggestion.label &&
    (draftValue.displayValue ?? suggestion.label) === suggestion.label &&
    Object.is(
      draftValue.parsedValue,
      (suggestion.metadata as { parsedValue?: unknown } | undefined)?.parsedValue ??
        suggestion.value
    )
  );
}

function isDraftValueUnchanged(
  cell: IImportSessionState['rows'][number]['cells'][string],
  draftValue: IValidatorDraftValue
): boolean {
  return (
    cell.rawValue === draftValue.rawValue &&
    (cell.displayValue ?? null) === (draftValue.displayValue ?? null)
  );
}

function resolveValidatorDisplayValue(
  field: IAdapterFieldDefinition,
  draftValue: IValidatorDraftValue
): string {
  if (field.inputType === ImportInputType.Select) {
    return getEntityImportSelectLabel(field, draftValue.rawValue);
  }

  if (field.inputType === ImportInputType.Date) {
    return formatImportDateDisplayValue(draftValue.rawValue);
  }

  return draftValue.displayValue ?? draftValue.rawValue;
}

function queryTableBodyContainer(root: ParentNode): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>('.rc-virtual-list-holder') ??
    root.querySelector<HTMLElement>('[class*="virtual-holder"]') ??
    root.querySelector<HTMLElement>('.ant-table-body')
  );
}

function resolveTableBodyContainer(trigger: HTMLElement | null): HTMLElement | null {
  const root = trigger?.closest('[data-entity-import-root]') ?? document;
  return queryTableBodyContainer(root);
}

function rememberTableBodyScrollTop(trigger: HTMLElement | null, scrollTop: number | null): void {
  const root = trigger?.closest('[data-entity-import-root]');
  if (!(root instanceof HTMLElement) || scrollTop === null) {
    return;
  }

  if (scrollTop !== 0 || !root.dataset.entityImportScrollTop) {
    root.dataset.entityImportScrollTop = String(scrollTop);
  }
}

function readRememberedTableBodyScrollTop(trigger: HTMLElement | null): number | null {
  const root = trigger?.closest('[data-entity-import-root]');
  if (!(root instanceof HTMLElement)) {
    return null;
  }

  const value = Number(root.dataset.entityImportScrollTop ?? '');
  return Number.isFinite(value) ? value : null;
}

function resolvePreferredTableBodyScrollTop(
  trigger: HTMLElement | null,
  scrollTop: number | null
): number | null {
  if (scrollTop === null) {
    return readRememberedTableBodyScrollTop(trigger);
  }

  if (scrollTop === 0) {
    return readRememberedTableBodyScrollTop(trigger) ?? 0;
  }

  return scrollTop;
}

function captureTableBodyScrollTop(trigger: HTMLElement | null): number | null {
  const scrollTop = resolveTableBodyContainer(trigger)?.scrollTop ?? null;
  rememberTableBodyScrollTop(trigger, scrollTop);
  return scrollTop;
}

function restoreCapturedTableBodyScroll(
  trigger: HTMLElement | null,
  scrollTop: number | null,
  action: () => void
): void {
  const root = trigger?.closest('[data-entity-import-root]') ?? document;

  action();

  if (scrollTop === null) {
    return;
  }

  const restoreAttempts = 4;
  const restore = (attempt: number) => {
    const tableBody = queryTableBodyContainer(root);
    if (tableBody?.isConnected) {
      tableBody.scrollTop = scrollTop;
    }

    if (attempt + 1 >= restoreAttempts) {
      return;
    }

    requestAnimationFrame(() => {
      restore(attempt + 1);
    });
  };

  requestAnimationFrame(() => {
    restore(0);
  });
}

function ValidatorSuggestionSkeletonList() {
  return (
    <div className="px-4 flex flex-col gap-1.5">
      {VALIDATOR_SUGGESTION_SKELETON_KEYS.map((key) => (
        <div
          key={key}
          className={cn(
            'flex min-w-0 items-center gap-2 overflow-hidden rounded-xl',
            'border border-neutral-200 bg-white px-3 py-3'
          )}
          data-testid="validator-suggestion-skeleton"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <Skeleton className="size-5 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

interface ValidatorFileDropzoneProps {
  field: IAdapterFieldDefinition;
  fileInputRef: RefObject<HTMLInputElement | null>;
  fileInputId: string;
  draftValue: IValidatorDraftValue;
  updateDraftValue: (value: IValidatorDraftValue) => void;
}

function ValidatorFileDropzone({
  field,
  fileInputRef,
  fileInputId,
  draftValue,
  updateDraftValue,
}: ValidatorFileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const processFiles = useCallback(
    (files: Array<File>) => {
      updateDraftValue({
        rawValue:
          files.length === 0
            ? ''
            : files.length === 1
              ? (files[0]?.name ?? '')
              : `${files.length} files selected`,
        displayValue:
          files.length === 0
            ? null
            : files.length === 1
              ? (files[0]?.name ?? null)
              : `${files.length} files selected`,
        parsedValue: files,
      });
    },
    [updateDraftValue]
  );

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    if (event.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  const hasFile = Boolean(draftValue.displayValue ?? draftValue.rawValue);

  return (
    <div>
      {/** biome-ignore lint/a11y/useSemanticElements: already have a button as child */}
      <div
        data-import-input-type-trigger={`${field.inputType}-file-dropzone`}
        className={cn(
          'relative flex flex-col items-center gap-2 rounded-xl',
          'border border-dashed py-5 text-center transition-colors cursor-pointer',
          { 'border-primary-8 bg-primary-8/5': isDragging },
          { 'border-neutral-300 bg-neutral-50': hasFile && !isDragging },
          { 'border-neutral-300 hover:border-neutral-400': !isDragging && !hasFile }
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Drop files here or click to browse"
      >
        <RiFolderUploadFill
          className={cn(
            'size-6',
            { 'text-primary-8': isDragging },
            { 'text-neutral-400': !isDragging }
          )}
        />

        {hasFile ? (
          <p className="text-sm font-medium text-primary-9 truncate max-w-full">
            {draftValue.displayValue ?? draftValue.rawValue}
          </p>
        ) : (
          <div className="space-y-0.5 select-none">
            <p className="text-sm text-neutral-500">
              Drop {getImportFileInputMultiple(field) ? 'files' : 'file'} here or{' '}
              <span className="font-medium text-primary-8 underline underline-offset-2">
                browse
              </span>
            </p>
          </div>
        )}
      </div>

      <input
        data-import-input-type={field.inputType}
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        aria-label="Validator file input"
        accept={buildFileAcceptValue(field.fileConfig)}
        multiple={getImportFileInputMultiple(field)}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          processFiles(files);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}

interface SingleColumnValidatorCardProps {
  field: IAdapterFieldDefinition;
  row: IImportRowState;
  fieldPosition: number;
  session: IImportSessionState;
  context: IEntityImportRuntimeContext;
  actions: IEntityImportActions;
  validatorPreview: IValidatorPreviewState;
  validatorSuggestions: IValidatorSuggestionState;
}

function SingleColumnValidatorCard({
  field,
  row,
  fieldPosition,
  session,
  context,
  actions,
  validatorPreview,
  validatorSuggestions,
}: SingleColumnValidatorCardProps) {
  const cell = row.cells[field.path];
  const selectedSuggestion = cell.remoteState.selectedSuggestion ?? null;
  const rowPosition = session.rows.findIndex((candidate) => candidate.id === row.id);
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingTableScrollTopRef = useRef<number | null>(null);
  const previewScrollRestoreFrameRef = useRef<number | null>(null);
  const activeValidatorPreview =
    validatorPreview.rowId === row.id && validatorPreview.fieldPath === field.path
      ? validatorPreview
      : null;
  const stagedDraftValue =
    field.validatorManualApplyMode === ValidatorManualApplyMode.Stage && cell.correctionDraft
      ? {
          rawValue: cell.correctionDraft.suggestion.label,
          displayValue: cell.correctionDraft.suggestion.label,
          parsedValue:
            (cell.correctionDraft.suggestion.metadata as { parsedValue?: unknown } | undefined)
              ?.parsedValue ?? cell.correctionDraft.suggestion.value,
        }
      : null;
  const draftValue = activeValidatorPreview ?? stagedDraftValue ?? createValidatorDraftValue(cell);

  useEffect(() => {
    return () => {
      if (previewScrollRestoreFrameRef.current !== null) {
        cancelAnimationFrame(previewScrollRestoreFrameRef.current);
      }
    };
  }, []);

  const preservePreviewTableScroll = useCallback(
    (trigger: HTMLElement | null, action: () => void) => {
      const preservedScrollTop = resolvePreferredTableBodyScrollTop(
        trigger,
        captureTableBodyScrollTop(trigger)
      );
      action();

      if (preservedScrollTop === null) {
        return;
      }

      if (previewScrollRestoreFrameRef.current !== null) {
        cancelAnimationFrame(previewScrollRestoreFrameRef.current);
      }

      previewScrollRestoreFrameRef.current = requestAnimationFrame(() => {
        const tableBody = resolveTableBodyContainer(trigger);
        if (tableBody?.isConnected) {
          tableBody.scrollTop = preservedScrollTop;
        }
        previewScrollRestoreFrameRef.current = null;
      });
    },
    []
  );

  const updateDraftValue = useCallback(
    (nextValue: IValidatorDraftValue) => {
      const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const nextPreviewValue = isDraftValueUnchanged(cell, nextValue) ? null : nextValue;

      preservePreviewTableScroll(trigger, () => {
        actions.setValidatorPreview({
          rowId: row.id,
          fieldPath: field.path,
          value: nextPreviewValue,
        });
      });
    },
    [actions, cell, field.path, preservePreviewTableScroll, row.id]
  );

  const commitManualValueToRow = useCallback(
    (rowId: string) => {
      if (
        field.inputType === ImportInputType.File ||
        field.inputType === ImportInputType.FileBundle
      ) {
        actions.setFileValue({
          rowId,
          fieldPath: field.path,
          files: toFileArray(draftValue.parsedValue),
          displayValue: draftValue.displayValue,
        });
        return;
      }

      if (field.inputType === ImportInputType.RemoteSelect) {
        actions.updateCellValue({
          rowId,
          fieldPath: field.path,
          rawValue: draftValue.rawValue,
        });
        return;
      }

      actions.setCustomValue({
        rowId,
        fieldPath: field.path,
        rawValue: draftValue.rawValue,
        displayValue: draftValue.displayValue,
        parsedValue: draftValue.parsedValue,
      });
    },
    [actions, draftValue, field]
  );

  const handleApply = useCallback(
    (applyToAll: boolean) => {
      if (doesDraftMatchSuggestion(draftValue, selectedSuggestion)) {
        actions.applySuggestion({
          fieldPath: field.path,
          targetRowId: row.id,
          sourceValue: cell.rawValue,
          suggestion: selectedSuggestion,
          applyToAllMatching: applyToAll,
          mode: ValidatorManualApplyMode.Commit,
        });
        actions.setValidatorPreview({ rowId: row.id, fieldPath: field.path, value: null });
        return;
      }

      if (isDraftValueUnchanged(cell, draftValue)) {
        actions.setValidatorPreview({ rowId: row.id, fieldPath: field.path, value: null });
        return;
      }

      if (applyToAll) {
        // batch all rows into a single commit instead of N individual commits.
        actions.applyManualValueToAll({
          fieldPath: field.path,
          targetRowIds: session.rows.map((r) => r.id),
          rawValue: draftValue.rawValue,
          displayValue: draftValue.displayValue,
          parsedValue: draftValue.parsedValue,
        });
      } else {
        commitManualValueToRow(row.id);
      }
      actions.setValidatorPreview({ rowId: row.id, fieldPath: field.path, value: null });
    },
    [
      actions,
      cell,
      commitManualValueToRow,
      draftValue,
      field.path,
      row,
      selectedSuggestion,
      session.rows,
    ]
  );
  const captureApplyScrollPosition = useCallback((trigger: HTMLElement | null) => {
    pendingTableScrollTopRef.current = resolvePreferredTableBodyScrollTop(
      trigger,
      captureTableBodyScrollTop(trigger)
    );
  }, []);
  const applyWithPreservedTableScroll = useCallback(
    (trigger: HTMLElement | null, applyToAll: boolean) => {
      const preservedScrollTop =
        resolvePreferredTableBodyScrollTop(trigger, pendingTableScrollTopRef.current) ??
        resolvePreferredTableBodyScrollTop(trigger, captureTableBodyScrollTop(trigger));
      pendingTableScrollTopRef.current = null;
      restoreCapturedTableBodyScroll(trigger, preservedScrollTop, () => handleApply(applyToAll));
    },
    [handleApply]
  );

  const previewValue = resolveValidatorDisplayValue(field, draftValue);
  const rowValues = getRowSubmissionValues(row);
  const activeValidatorSuggestions =
    validatorSuggestions.rowId === row.id && validatorSuggestions.fieldPath === field.path
      ? validatorSuggestions
      : null;
  const visibleSuggestions =
    activeValidatorSuggestions?.suggestions ?? cell.remoteState.suggestions;

  const visibleSuggestionPaging =
    activeValidatorSuggestions?.suggestionPaging ?? cell.remoteState.suggestionPaging;
  const visibleMessage = activeValidatorSuggestions?.message ?? cell.remoteState.message;
  const shouldShowSuggestionSkeleton =
    field.inputType === ImportInputType.RemoteSelect &&
    Boolean(field.remote?.query) &&
    activeValidatorSuggestions?.status === RemoteValidationStatus.Pending &&
    visibleSuggestions.length === 0;
  const shouldShowSuggestions =
    field.inputType !== ImportInputType.Select &&
    visibleSuggestions.length > 0 &&
    !(
      field.inputType === ImportInputType.Compound &&
      field.validatorManualApplyMode === ValidatorManualApplyMode.Stage &&
      cell.correctionDraft
    );

  const goNeighborRow = (delta: number) => {
    const nextIndex = rowPosition + delta;
    if (nextIndex < 0 || nextIndex >= session.rows.length) {
      return;
    }

    actions.setValidatorSelection({ rowId: session.rows[nextIndex].id });
  };

  return (
    <Card className="rounded-2xl border border-neutral-200 py-0">
      <CardContent className="space-y-4 py-4 px-0">
        <div className="flex items-start justify-between gap-3 px-4">
          <p className="text-base text-left font-bold uppercase tracking-wide text-primary-9">
            {field.label}
          </p>
          <span className="text-sm text-center font-light text-neutral-500">
            Column {fieldPosition >= 0 ? fieldPosition + 1 : '—'}
          </span>
        </div>

        <div className="border-b border-neutral-200 pb-4 px-4 min-w-0 max-w-full">
          <div className="flex min-w-0 items-stretch gap-2">
            <Button
              rounded
              data-import-control="previous-row-button"
              type="button"
              variant="ghost"
              size="md"
              className="size-10! shrink-0 px-0"
              disabled={rowPosition <= 0}
              aria-label="Previous row"
              onClick={() => goNeighborRow(-1)}
            >
              <LeftOutlined />
            </Button>
            <div
              className={cn(
                'flex h-10 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl',
                'border border-neutral-200 bg-neutral-50 px-3 py-2 text-base font-semibold text-blue-950'
              )}
              title={previewValue.trim() ? previewValue : undefined}
            >
              <span className="block min-w-0 w-full truncate text-center">
                {previewValue || '—'}
              </span>
            </div>
            <Button
              rounded
              data-import-control-trigger="next-row-button"
              type="button"
              variant="ghost"
              size="md"
              className="size-10! shrink-0 px-0"
              disabled={rowPosition < 0 || rowPosition >= session.rows.length - 1}
              aria-label="Next row"
              onClick={() => goNeighborRow(1)}
            >
              <RightOutlined />
            </Button>
          </div>
          <p className="mt-1 ml-13 text-left text-sm text-neutral-500">
            Row {row.rowIndex + 1} of {session.rows.length}
          </p>
        </div>

        <div className="px-4">
          {field.required && (
            <span
              className={cn(
                'inline-flex rounded-full bg-neutral-100 px-2.5',
                'py-1 text-xs font-semibold text-neutral-700'
              )}
            >
              Required
            </span>
          )}
        </div>

        {field.panelRenderer?.({
          field,
          cell,
          row,
          session,
          context,
          actions,
          suggestions: visibleSuggestions,
          draftValue,
          onDraftChange: updateDraftValue,
        })}

        <div className="px-4">
          {!field.panelRenderer && field.inputType === ImportInputType.RemoteSelect && (
            <div
              className={cn(
                'pr-4 pl-0 flex items-center gap-2',
                'border rounded-full border-neutral-2 focus-within:border-primary-6 group'
              )}
            >
              <Input
                data-import-input-type={field.inputType}
                autoComplete="off"
                id="validator-value"
                aria-label="Validator value"
                type="text"
                className={cn(
                  'h-11 text-lg! text-primary-9! focus-visible:border-none',
                  'focus-visible:outline-none focus-visible:ring-0 shadow-none border-none',
                  'font-semibold'
                )}
                value={draftValue.displayValue ?? draftValue.rawValue}
                onChange={(event) => {
                  const nextRawValue = event.target.value;
                  updateDraftValue({
                    rawValue: nextRawValue,
                    displayValue: null,
                    parsedValue: nextRawValue,
                  });
                  void actions.requestSuggestions({
                    rowId: row.id,
                    fieldPath: field.path,
                    query: nextRawValue,
                  });
                }}
              />
              <div className="flex items-center gap-2">
                <RiSearchLine
                  className={cn(
                    'text-primary-9 size-4 group-focus-within:text-primary-6',
                    'group-focus-within:scale-110 transition-all duration-100'
                  )}
                />
              </div>
            </div>
          )}
          {!field.panelRenderer && field.inputType === ImportInputType.Textarea && (
            <Textarea
              rows={1}
              data-import-input-type={field.inputType}
              id="validator-value"
              aria-label="Validator value"
              value={draftValue.displayValue ?? draftValue.rawValue}
              className={cn(
                'border border-neutral-200 bg-white rounded-xl p-2',
                ' focus-within:border-primary-6! focus-visible:ring-0! focus-visible:outline-none!',
                'shadow-none! ring-0!'
              )}
              onChange={(event) => {
                updateDraftValue({
                  rawValue: event.target.value,
                  displayValue: null,
                  parsedValue: event.target.value,
                });
              }}
            />
          )}

          {!field.panelRenderer && field.inputType === ImportInputType.Date && (
            <DatePicker
              data-import-input-type={field.inputType}
              id="validator-value"
              aria-label="Validator value"
              value={parseImportDatePickerValue(draftValue.rawValue)}
              className="h-11 text-lg! rounded-full text-primary-9! focus-within:border-primary-6 w-full"
              format="DD/MM/YYYY"
              onChange={(date) => {
                const rawValue = importDatePickerChangeToRawValue(date);
                updateDraftValue({
                  rawValue,
                  displayValue: null,
                  parsedValue: rawValue,
                });
              }}
            />
          )}

          {!field.panelRenderer && (
            <div className="space-y-4 px-4">
              {(field.inputType === ImportInputType.Text ||
                field.inputType === ImportInputType.Number) && (
                <Input
                  data-import-input-type={field.inputType}
                  id="validator-value"
                  aria-label="Validator value"
                  type={field.inputType === ImportInputType.Number ? 'number' : 'text'}
                  className="h-11 text-lg! rounded-full text-primary-9! focus-within:border-primary-6"
                  value={draftValue.displayValue ?? draftValue.rawValue}
                  onChange={(event) => {
                    updateDraftValue({
                      rawValue: event.target.value,
                      displayValue: null,
                      parsedValue: event.target.value,
                    });
                  }}
                />
              )}

              {field.inputType === ImportInputType.Select && (
                <Select
                  data-import-input-type={ImportInputType.Select}
                  value={draftValue.rawValue}
                  onValueChange={(value) =>
                    updateDraftValue({
                      rawValue: value,
                      displayValue: null,
                      parsedValue: value,
                    })
                  }
                >
                  <SelectTrigger
                    id="validator-select"
                    data-import-input-type-trigger={`${field.inputType}-select-trigger`}
                    aria-label="Validator value"
                    className={cn(
                      'w-full rounded-2xl border-neutral-200 bg-white',
                      'h-11! text-primary-9 font-bold'
                    )}
                  >
                    <SelectValue
                      data-import-input-type-value={`${field.inputType}-select-value`}
                      placeholder={field.placeholder ?? `Select ${field.label}`}
                    />
                  </SelectTrigger>
                  <SelectContent
                    className={cn(
                      ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME,
                      'px-4! rounded-2xl',
                      '[&>div:first-of-type]:min-w-[calc(var(--radix-select-trigger-width)-3rem)]'
                    )}
                    style={{
                      maxWidth: 'var(--radix-select-trigger-width)',
                    }}
                  >
                    {field.options?.map((option) => (
                      <SelectItem
                        data-import-input-type-item={`${field.inputType}-option`}
                        key={option.value}
                        value={option.value}
                        className={cn(
                          'w-full text-left h-11 cursor-pointer font-semibold text-primary-9 rounded-2xl',
                          '[&_span]:right-4'
                        )}
                        style={{ width: 'calc(var(--radix-select-trigger-width) - 2rem)' }}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(field.inputType === ImportInputType.File ||
                field.inputType === ImportInputType.FileBundle) && (
                <ValidatorFileDropzone
                  field={field}
                  fileInputRef={fileInputRef}
                  fileInputId={fileInputId}
                  draftValue={draftValue}
                  updateDraftValue={updateDraftValue}
                />
              )}
            </div>
          )}
        </div>

        <div className="px-4">
          {cell.issues.length > 0 && (
            <Alert appearance="light" variant="warning">
              <AlertContent>
                <AlertDescription>{cell.issues[0]}</AlertDescription>
              </AlertContent>
            </Alert>
          )}
          {cell.issues.length === 0 && visibleMessage && (
            <Alert appearance="light" variant="info">
              <AlertContent>
                <AlertDescription>{visibleMessage}</AlertDescription>
              </AlertContent>
            </Alert>
          )}
        </div>

        {shouldShowSuggestionSkeleton && <ValidatorSuggestionSkeletonList />}

        {shouldShowSuggestions && (
          <div className="px-4 flex flex-col gap-1.5">
            {visibleSuggestions.map((suggestion) => {
              const isSelected =
                doesDraftMatchSuggestion(draftValue, selectedSuggestion) &&
                selectedSuggestion.value === suggestion.value;
              const suggestionDetails = field.validatorSuggestionDetails?.({
                suggestion,
                cell,
                row,
                values: rowValues,
              });
              return (
                <div
                  data-import-input-type-item={`${field.inputType}-suggestion`}
                  key={suggestion.value}
                  className={cn(
                    'flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border',
                    'px-3 py-3 transition-all ease-out-expo select-none',
                    isSelected
                      ? 'border-green-main bg-green-main/10 text-green-main border-2'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  )}
                >
                  <button
                    type="button"
                    aria-label={`Select suggestion ${suggestion.label}`}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-3 overflow-hidden whitespace-normal text-left text-base'
                    )}
                    onClick={(event) =>
                      preservePreviewTableScroll(event.currentTarget, () =>
                        actions.chooseSuggestion({
                          rowId: row.id,
                          fieldPath: field.path,
                          suggestion,
                        })
                      )
                    }
                  >
                    <div className="min-w-0 flex-1 text-left">
                      <span
                        className={cn('block font-medium wrap-break-word whitespace-normal', {
                          'font-bold!': isSelected,
                        })}
                      >
                        {suggestion.label}
                      </span>
                      {/* {suggestion.recommended && (
                        <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Recommended
                        </span>
                      )} */}
                    </div>
                  </button>
                  {suggestionDetails ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Show details for suggestion ${suggestion.label} (${suggestion.value})`}
                          className={cn(
                            ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
                            'size-5.5! shrink-0 self-center bg-white group'
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <RiInfoI className="size-3.5! text-primary-8! group-hover:text-primary-6!" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="end"
                        sideOffset={0}
                        alignOffset={0}
                        arrowClassName="bg-white"
                        className={ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME}
                      >
                        {suggestionDetails}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  <div
                    className={cn(
                      'flex size-5! shrink-0 items-center justify-center rounded-full border border-neutral-200 p-2',
                      isSelected
                        ? 'border-green-main bg-green-main text-white'
                        : 'border-neutral-200 hover:border-neutral-300'
                    )}
                  >
                    {isSelected && <CheckOutlined className="opacity-100 size-2.5!" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {field.remote?.query &&
          (visibleSuggestionPaging?.hasNextPage || visibleSuggestionPaging?.isFetchingNextPage) && (
            <div className="px-4">
              <Button
                rounded
                type="button"
                variant="outline"
                size="md"
                className="w-full text-sm text-primary-9 active:text-white select-none"
                disabled={visibleSuggestionPaging?.isFetchingNextPage}
                onClick={() => actions.loadMoreSuggestions()}
              >
                {visibleSuggestionPaging?.isFetchingNextPage ? (
                  <div className="flex items-center gap-2">
                    <LoadingOutlined spin />
                    <span className="text-sm text-primary-9">Loading...</span>
                  </div>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}

        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4 px-4">
          <div className="flex items-center gap-3">
            <Button
              rounded
              variant="outline"
              type="button"
              size="md"
              className="flex-1 cursor-pointer"
              disabled={Boolean(cell.correctionDraft)}
              onMouseDown={(event) => {
                event.preventDefault();
                captureApplyScrollPosition(event.currentTarget);
              }}
              onClick={(event) => {
                applyWithPreservedTableScroll(event.currentTarget, true);
              }}
            >
              Apply to all
            </Button>
            <Button
              rounded
              type="button"
              variant="success"
              size="md"
              className="flex-1 cursor-pointer"
              disabled={Boolean(cell.correctionDraft)}
              onMouseDown={(event) => {
                event.preventDefault();
                captureApplyScrollPosition(event.currentTarget);
              }}
              onClick={(event) => {
                applyWithPreservedTableScroll(event.currentTarget, false);
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ValidatorPanel<TPayload, TResult>({
  adapter,
  context,
  session,
  actions,
  isSubmitting,
  importRun,
  validatorPreview,
  validatorSuggestions,
  fieldStatusMap,
  rowsSummaryStatus,
  collapsed,
  hoverExpanded,
  onToggleCollapsed,
  onHoverExpandedChange,
}: IValidatorPanelProps<TPayload, TResult>) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (!collapsed) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    onHoverExpandedChange(true);
  }, [collapsed, onHoverExpandedChange]);

  const handleMouseLeave = useCallback(() => {
    if (!collapsed) return;
    hoverTimeoutRef.current = setTimeout(() => {
      onHoverExpandedChange(false);
    }, 200);
  }, [collapsed, onHoverExpandedChange]);

  // reset hover state when user explicitly expands
  useEffect(() => {
    if (!collapsed) {
      onHoverExpandedChange(false);
    }
  }, [collapsed, onHoverExpandedChange]);
  const activeRow = resolveActiveRow(session);
  const activeField = resolveActiveField(adapter, session);
  const selectedFieldPath = session.validatorSelection.fieldPath;
  const fieldPosition = activeField
    ? adapter.fields.findIndex((field) => field.path === activeField.path)
    : -1;
  const hasRows = session.rows.length > 0;
  const isAllColumnsMode = selectedFieldPath === ENTITY_IMPORT_ALL_COLUMNS;
  const showSelectionPrompt =
    !hasRows ||
    (!session.validatorSelection.rowId && !session.validatorSelection.fieldPath) ||
    (!activeRow && !isAllColumnsMode) ||
    (isAllColumnsMode && !activeRow) ||
    (!activeField && !isAllColumnsMode);
  const submitProgressPercent = resolveImportRunProgressPercent(importRun);
  const submitButtonTone = resolveSubmitButtonTone(importRun);
  const submitButtonLabel = resolveSubmitButtonLabel(adapter, session, importRun);
  const hasPendingValidatorPreview =
    validatorPreview.rowId !== null && validatorPreview.fieldPath !== null;
  const showImportFailureTooltip =
    importRun.phase === ImportRunPhase.Completed && importRun.failureCards.length > 0;
  const validatorScrollResetKey = `${session.validatorSelection.rowId ?? ''}:${session.validatorSelection.fieldPath ?? ''}:${validatorSuggestions.query}`;
  const submitButtonStyle = {
    '--entity-import-submit-progress': `${submitProgressPercent}%`,
  } as CSSProperties;

  useEffect(() => {
    void validatorScrollResetKey;

    if (!scrollContainerRef.current) {
      return;
    }

    scrollContainerRef.current.scrollTop = 0;
  }, [validatorScrollResetKey]);

  if (collapsed && !hoverExpanded) {
    return (
      <aside
        className="flex h-full min-h-0 flex-col items-center gap-3 px-0.5"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={cn(
            'flex h-full flex-col items-center gap-3 rounded-full',
            'border border-neutral-200 bg-white px-1.5 py-3 shadow-sm'
          )}
        >
          <button
            type="button"
            aria-label="Expand validator panel"
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full',
              'text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-primary-9'
            )}
            onClick={onToggleCollapsed}
          >
            <PlusOutlined className="text-xs" />
          </button>

          <span
            className={cn(
              'text-[11px] font-semibold tracking-widest text-primary-9',
              '[writing-mode:vertical-lr] rotate-180 select-none'
            )}
          >
            Validator
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              rounded
              type="button"
              variant="icon"
              size="md"
              className={cn(
                'shrink-0 border bg-white shadow-none',
                SUBMIT_BUTTON_CHROME_CLASSNAME[submitButtonTone]
              )}
              disabled={!session.summary.canSubmit || isSubmitting || hasPendingValidatorPreview}
              onClick={() => void actions.submitRows()}
              aria-label="Import rows"
            >
              <RiUpload2Line className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {submitButtonLabel}
          </TooltipContent>
        </Tooltip>
      </aside>
    );
  }

  return (
    <aside
      className="flex h-full min-h-0 flex-col gap-1.5 overflow-hidden px-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          'flex flex-col h-full min-h-0 max-h-[calc(100%-42px)] shadow-sm',
          'hover:shadow-md py-4 rounded-3xl border border-neutral-200 bg-white'
        )}
      >
        <div className={cn('shrink-0 px-3 pb-4 text-white', { 'text-white': !collapsed })}>
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-2xl font-semibold leading-none tracking-tight text-primary-9">
              Validator
            </h3>
            <button
              type="button"
              aria-label={collapsed ? 'Expand validator panel' : 'Collapse validator panel'}
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full',
                'text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-primary-9'
              )}
              onClick={onToggleCollapsed}
            >
              {collapsed ? (
                <PlusOutlined className="text-xs" />
              ) : (
                <MinusOutlined className="text-xs" />
              )}
            </button>
          </div>
          <div className="mt-3 h-px bg-neutral-2" />

          <div className="mt-5 space-y-1">
            <div className="grid grid-cols-[auto_1fr] items-center justify-between gap-1 w-full">
              <div className="text-base font-light text-gray-400">Columns</div>
              <Select
                value={session.validatorSelection.fieldPath ?? ''}
                onValueChange={(fieldPath) => actions.setValidatorSelection({ fieldPath })}
              >
                <SelectTrigger
                  id="validator-column-select"
                  aria-label="Select column"
                  className={cn(ENTITY_IMPORT_PANEL_SELECT_TRIGGER_CLASSNAME)}
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent
                  className={cn(ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME, 'max-h-80')}
                  align="end"
                >
                  <SelectItem
                    withIndicator={false}
                    value={ENTITY_IMPORT_ALL_COLUMNS}
                    checkClassName="hidden"
                    className={cn(
                      'px-4 py-2.5 text-sm text-neutral-500 focus:bg-neutral-50',
                      '[&_span:first-of-type]:w-full justify-between cursor-pointer'
                    )}
                  >
                    <span className="flex text-base w-full items-center justify-between gap-6">
                      <span>All</span>
                      <ValidationStatusIcon status={rowsSummaryStatus} />
                    </span>
                  </SelectItem>
                  <SelectSeparator className="mx-3 my-1 bg-neutral-200" />
                  {adapter.fields.map((field, index) => (
                    <SelectItem
                      withIndicator={false}
                      key={field.path}
                      value={field.path}
                      checkClassName="hidden"
                      className={cn(
                        'px-4 py-2.5 text-sm text-neutral-500 focus:bg-neutral-50',
                        '[&_span:first-of-type]:w-full justify-between cursor-pointer',
                        { 'text-primary-8': field.path === selectedFieldPath }
                      )}
                      style={{ maxWidth: 'var(--radix-select-trigger-width)' }}
                    >
                      <span className="flex text-base w-full items-center justify-between gap-6">
                        <span>{index + 1}</span>
                        <ValidationStatusIcon
                          status={fieldStatusMap[field.path] ?? ValidatorFieldStatus.Idle}
                        />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3">
              <div className="text-base font-light text-gray-400">Rows</div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Select
                  value={session.validatorSelection.rowId ?? ''}
                  onValueChange={(rowId) => {
                    actions.setValidatorSelection({ rowId });
                  }}
                >
                  <SelectTrigger
                    id="validator-row-select"
                    aria-label="Select row"
                    className={ENTITY_IMPORT_PANEL_SELECT_TRIGGER_CLASSNAME}
                  >
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent
                    className={cn(ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME, 'max-h-80')}
                    align="end"
                  >
                    {session.rows.map((row) => (
                      <SelectItem
                        withIndicator={false}
                        key={row.id}
                        value={row.id}
                        checkClassName="hidden"
                        className={cn(
                          'px-4 py-2.5 text-sm text-neutral-500 focus:bg-neutral-50',
                          '[&_span:first-of-type]:w-full justify-between cursor-pointer',
                          { 'text-neutral-700': row.id === session.validatorSelection.rowId }
                        )}
                        style={{ maxWidth: 'var(--radix-select-trigger-width)' }}
                      >
                        <span className="flex w-full items-center justify-between gap-6">
                          <span>{row.rowIndex + 1}</span>
                          <ValidationStatusIcon status={resolveRowStatus(adapter, row)} />
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto secondary-scrollbar overflow-x-hidden px-3 py-5"
        >
          {showSelectionPrompt ? (
            <Card className="py-0 border-none! shadow-none!">
              <CardContent className="px-6 py-8 text-sm text-neutral-500">
                {hasRows
                  ? 'Select a row and column to begin validation.'
                  : 'Add at least one row to begin validating data.'}
              </CardContent>
            </Card>
          ) : isAllColumnsMode && activeRow ? (
            <div className="space-y-4">
              {adapter.fields.map((field, index) => (
                <section
                  key={`${activeRow.id}:${field.path}`}
                  aria-label={`Validator box ${field.label}`}
                >
                  <SingleColumnValidatorCard
                    field={field}
                    row={activeRow}
                    fieldPosition={index}
                    session={session}
                    context={context}
                    actions={actions}
                    validatorPreview={validatorPreview}
                    validatorSuggestions={validatorSuggestions}
                  />
                </section>
              ))}
            </div>
          ) : activeRow && activeField ? (
            <SingleColumnValidatorCard
              key={`${activeRow.id}:${activeField.path}`}
              field={activeField}
              row={activeRow}
              fieldPosition={fieldPosition}
              session={session}
              context={context}
              actions={actions}
              validatorPreview={validatorPreview}
              validatorSuggestions={validatorSuggestions}
            />
          ) : null}
        </div>
      </div>

      <Tooltip
        open
        key={
          showImportFailureTooltip
            ? `import-failures-${importRun.failedRowCount}`
            : 'import-failures-idle'
        }
        defaultOpen={showImportFailureTooltip}
      >
        <TooltipTrigger asChild>
          <Button
            rounded
            type="button"
            variant="outline"
            size="lg"
            className={cn(
              'relative mt-auto w-full overflow-hidden border bg-white shadow-none',
              SUBMIT_BUTTON_CHROME_CLASSNAME[submitButtonTone]
            )}
            style={submitButtonStyle}
            data-import-run-tone={submitButtonTone}
            disabled={!session.summary.canSubmit || isSubmitting || hasPendingValidatorPreview}
            onClick={() => void actions.submitRows()}
          >
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 rounded-full transition-[clip-path] duration-300 ease-out',
                resolveSubmitButtonFillClassName(submitButtonTone)
              )}
              style={{
                clipPath: `inset(0 ${Math.max(0, 100 - submitProgressPercent)}% 0 0 round 9999px)`,
              }}
            />
            <span className="relative z-10 flex w-full items-center justify-center">
              <span className="text-primary-9">{submitButtonLabel}</span>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{
                  clipPath: `inset(0 ${Math.max(0, 100 - submitProgressPercent)}% 0 0)`,
                }}
              >
                <span className="flex h-full w-full items-center justify-center text-white">
                  {submitButtonLabel}
                </span>
              </span>
            </span>
          </Button>
        </TooltipTrigger>
        {showImportFailureTooltip ? (
          <TooltipContent
            data-testid="import-run-failure-tooltip"
            side="top"
            align="end"
            className={cn(
              ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME,
              'w-[calc(100vw-2rem)] p-3 text-left text-neutral-900 shadow-2xl sm:w-[500px]'
            )}
            style={{ maxWidth: '500px' }}
            arrowClassName="bg-white"
          >
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-primary-9">
                  {resolveImportFailureSummary(importRun)}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Review the failing rows below, fix the issues, then retry the import.
                </p>
              </div>
              <div
                data-testid="import-run-failure-list"
                className="max-h-72 space-y-2 overflow-y-auto secondary-scrollbar pr-1"
              >
                {importRun.failureCards.map((failure) => (
                  <Card
                    key={failure.rowId}
                    className="border border-rose-200 bg-rose-50 shadow-none p-0!"
                  >
                    <CardContent className="px-3 py-3">
                      <p className="text-sm font-semibold text-rose-900">Row {failure.rowNumber}</p>
                      <p className="mt-1 text-sm leading-5 text-rose-900/90">{failure.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TooltipContent>
        ) : null}
      </Tooltip>
    </aside>
  );
}
