'use client';

import {
  CheckOutlined,
  ExclamationCircleOutlined,
  LeftOutlined,
  LoadingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { RiInfoI, RiSearchLine } from '@remixicon/react';
import { DatePicker } from 'antd';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import {
  CellStatus,
  ENTITY_IMPORT_ALL_COLUMNS,
  type IImportRowState,
  type IImportSessionState,
  ImportInputType,
  type ISuggestion,
  RowStatus,
} from '@/features/entity-import/core/contracts';
import {
  buildFileAcceptValue,
  getImportFileButtonLabel,
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
  getEntityImportSelectLabel,
} from '@/features/entity-import/ui/select-styles';
import {
  ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
  ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME,
} from '@/features/entity-import/ui/tooltip-styles';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type {
  EntityImportRuntimeContext,
  IAdapterFieldDefinition,
  IEntityImportActions,
  IEntityImportAdapter,
  IValidatorSuggestionState,
  ValidatorDraftValue,
} from '@/features/entity-import/core/adapter';

interface ValidatorPanelProps<TPayload, TResult> {
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  session: IImportSessionState;
  actions: IEntityImportActions;
  isSubmitting: boolean;
  validatorSuggestions: IValidatorSuggestionState;
}

const ValidatorFieldStatus = {
  Idle: 'idle',
  Valid: 'valid',
  Warning: 'warning',
} as const;

type TValidatorFieldStatus = (typeof ValidatorFieldStatus)[keyof typeof ValidatorFieldStatus];

function resolveFieldStatus(
  session: IImportSessionState,
  fieldPath: string
): TValidatorFieldStatus {
  const cells = session.rows.map((row) => row.cells[fieldPath]);
  if (
    cells.some((cell) => cell.status === CellStatus.Invalid || cell.status === CellStatus.Disabled)
  ) {
    return ValidatorFieldStatus.Warning;
  }
  if (cells.length > 0 && cells.every((cell) => cell.status === CellStatus.Valid)) {
    return ValidatorFieldStatus.Valid;
  }
  return ValidatorFieldStatus.Idle;
}

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

function resolveRowStatus(row: IImportRowState): TValidatorFieldStatus {
  if (row.rowStatus === RowStatus.Invalid) {
    return ValidatorFieldStatus.Warning;
  }

  if (row.rowStatus === RowStatus.Valid) {
    return ValidatorFieldStatus.Valid;
  }

  return ValidatorFieldStatus.Idle;
}

function resolveRowsSummaryStatus(session: IImportSessionState): TValidatorFieldStatus {
  if (session.rows.some((row) => row.rowStatus === RowStatus.Invalid)) {
    return ValidatorFieldStatus.Warning;
  }

  if (session.rows.length > 0 && session.rows.every((row) => row.rowStatus === RowStatus.Valid)) {
    return ValidatorFieldStatus.Valid;
  }

  return ValidatorFieldStatus.Idle;
}

function ValidationStatusIcon({ status }: { status: TValidatorFieldStatus }) {
  if (status === ValidatorFieldStatus.Valid) {
    return <CheckOutlined className="text-base text-[#2ea43a]" />;
  }

  if (status === ValidatorFieldStatus.Warning) {
    return <ExclamationCircleOutlined className="text-base text-[#c87a14]" />;
  }

  return <span className="inline-flex size-4" />;
}

function createValidatorDraftValue(
  cell: IImportSessionState['rows'][number]['cells'][string]
): ValidatorDraftValue {
  return {
    rawValue: cell.rawValue,
    displayValue: cell.displayValue ?? null,
    parsedValue: cell.parsedValue,
  };
}

function createManualDraftSuggestion(draftValue: ValidatorDraftValue): ISuggestion {
  const label = draftValue.displayValue ?? draftValue.rawValue;

  return {
    value: draftValue.rawValue,
    label,
  };
}

function isDraftValueUnchanged(
  cell: IImportSessionState['rows'][number]['cells'][string],
  draftValue: ValidatorDraftValue
): boolean {
  return (
    cell.rawValue === draftValue.rawValue &&
    (cell.displayValue ?? null) === (draftValue.displayValue ?? null)
  );
}

function resolveValidatorDisplayValue(
  field: IAdapterFieldDefinition,
  draftValue: ValidatorDraftValue
): string {
  if (field.inputType === ImportInputType.Select) {
    return getEntityImportSelectLabel(field, draftValue.rawValue);
  }

  if (field.inputType === ImportInputType.Date) {
    return formatImportDateDisplayValue(draftValue.rawValue);
  }

  return draftValue.displayValue ?? draftValue.rawValue;
}

interface SingleColumnValidatorCardProps {
  field: IAdapterFieldDefinition;
  row: IImportRowState;
  fieldPosition: number;
  session: IImportSessionState;
  context: EntityImportRuntimeContext;
  actions: IEntityImportActions;
  validatorSuggestions: IValidatorSuggestionState;
}

function SingleColumnValidatorCard({
  field,
  row,
  fieldPosition,
  session,
  context,
  actions,
  validatorSuggestions,
}: SingleColumnValidatorCardProps) {
  const cell = row.cells[field.path];
  const selectedSuggestion = cell.remoteState.selectedSuggestion ?? null;
  const rowPosition = session.rows.findIndex((candidate) => candidate.id === row.id);
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previousSelectionKeyRef = useRef('');
  const selectionKey = `${row.id}:${field.path}`;
  const [draftValue, setDraftValue] = useState<ValidatorDraftValue>(() =>
    createValidatorDraftValue(cell)
  );
  const [hasPendingManualChange, setHasPendingManualChange] = useState(false);

  useEffect(() => {
    if (previousSelectionKeyRef.current === selectionKey) {
      return;
    }

    previousSelectionKeyRef.current = selectionKey;
    setDraftValue(createValidatorDraftValue(cell));
    setHasPendingManualChange(false);
  }, [cell, selectionKey]);

  useEffect(() => {
    if (selectedSuggestion || hasPendingManualChange) {
      return;
    }

    setDraftValue(createValidatorDraftValue(cell));
  }, [cell, hasPendingManualChange, selectedSuggestion]);

  const updateDraftValue = useCallback((nextValue: ValidatorDraftValue) => {
    setDraftValue(nextValue);
    setHasPendingManualChange(true);
  }, []);

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
      if (selectedSuggestion) {
        actions.applySuggestion({
          fieldPath: field.path,
          targetRowId: row.id,
          sourceValue: cell.rawValue,
          suggestion: selectedSuggestion,
          applyToAllMatching: applyToAll,
        });
        setHasPendingManualChange(false);
        return;
      }

      if (isDraftValueUnchanged(cell, draftValue)) {
        setHasPendingManualChange(false);
        return;
      }

      if (field.validatorManualApplyMode === 'stage') {
        actions.applySuggestion({
          fieldPath: field.path,
          targetRowId: row.id,
          sourceValue: cell.rawValue,
          suggestion: createManualDraftSuggestion(draftValue),
          applyToAllMatching: applyToAll,
        });
        setHasPendingManualChange(false);
        return;
      }

      const targetRows = applyToAll ? session.rows : [row];
      targetRows.forEach((targetRow) => {
        commitManualValueToRow(targetRow.id);
      });
      setHasPendingManualChange(false);
    },
    [
      actions,
      cell,
      commitManualValueToRow,
      draftValue,
      field.path,
      field.validatorManualApplyMode,
      row,
      selectedSuggestion,
      session.rows,
    ]
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
              className="flex h-10 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-base font-semibold text-blue-950"
              title={previewValue.trim() ? previewValue : undefined}
            >
              <span className="block min-w-0 w-full truncate text-center">
                {previewValue || '—'}
              </span>
            </div>
            <Button
              rounded
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
            <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
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
                  actions.updateCellValue({
                    rowId: row.id,
                    fieldPath: field.path,
                    rawValue: nextRawValue,
                  });
                }}
              />
              <div className="flex items-center gap-2">
                <RiSearchLine className="text-primary-9 size-4 group-focus-within:text-primary-6 group-focus-within:scale-110 transition-all duration-100" />
              </div>
            </div>
          )}
          {!field.panelRenderer && field.inputType === ImportInputType.Textarea && (
            <Textarea
              rows={1}
              id="validator-value"
              aria-label="Validator value"
              value={draftValue.displayValue ?? draftValue.rawValue}
              className={cn(
                'border border-neutral-200 bg-white rounded-xl p-2 focus-within:border-primary-6! focus-visible:ring-0! focus-visible:outline-none!',
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
                <div>
                  <Select
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
                      aria-label="Validator value"
                      className="w-full rounded-xl border-neutral-200 bg-white"
                    >
                      <SelectValue placeholder={field.placeholder ?? `Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent className={ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME}>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(field.inputType === ImportInputType.File ||
                field.inputType === ImportInputType.FileBundle) && (
                <div>
                  <Button
                    rounded
                    type="button"
                    variant="outline"
                    size="md"
                    className="w-full justify-start text-left"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {(draftValue.displayValue ?? draftValue.rawValue) ||
                      getImportFileButtonLabel(field)}
                  </Button>
                  <input
                    ref={fileInputRef}
                    id={fileInputId}
                    type="file"
                    aria-label="Validator file input"
                    accept={buildFileAcceptValue(field.fileConfig)}
                    multiple={getImportFileInputMultiple(field)}
                    className="sr-only"
                    onChange={(event) => {
                      const files = Array.from(event.currentTarget.files ?? []);
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
                      event.currentTarget.value = '';
                    }}
                  />
                </div>
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

        {visibleSuggestions.length > 0 && (
          <div className="px-4 flex flex-col gap-1.5">
            {visibleSuggestions.map((suggestion) => {
              const isSelected = selectedSuggestion?.value === suggestion.value;
              const suggestionDetails = field.validatorSuggestionDetails?.({
                suggestion,
                cell,
                row,
                values: rowValues,
              });

              return (
                <div
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
                    onClick={() =>
                      actions.chooseSuggestion({
                        rowId: row.id,
                        fieldPath: field.path,
                        suggestion,
                      })
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
              onClick={() => handleApply(true)}
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
              onClick={() => handleApply(false)}
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
  validatorSuggestions,
}: ValidatorPanelProps<TPayload, TResult>) {
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

  return (
    <aside className="flex h-full min-h-0 flex-col gap-1.5 overflow-hidden px-2">
      <div className="flex flex-col h-full min-h-0 max-h-[calc(100%-42px)] shadow-sm hover:shadow-md py-4 rounded-3xl border border-neutral-200 bg-white">
        <div className="shrink-0 px-3 pb-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-2xl font-semibold leading-none tracking-tight text-primary-9">
              Validator
            </h3>
          </div>
          <div className="mt-3 h-px bg-neutral-2" />

          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-[auto_1fr] items-center justify-between gap-1 w-full">
              <div className="text-base font-light text-gray-400">Columns</div>
              <Select
                value={session.validatorSelection.fieldPath ?? ''}
                onValueChange={(fieldPath) => actions.setValidatorSelection({ fieldPath })}
              >
                <SelectTrigger
                  id="validator-column-select"
                  aria-label="Select column"
                  className={ENTITY_IMPORT_PANEL_SELECT_TRIGGER_CLASSNAME}
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className={cn(ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME, 'max-h-80')}>
                  <SelectItem
                    value={ENTITY_IMPORT_ALL_COLUMNS}
                    checkClassName="hidden"
                    className="px-4 py-2.5 text-sm text-neutral-500 focus:bg-neutral-50 [&_.indicator]:hidden"
                  >
                    <span className="flex text-base w-full items-center justify-between gap-6">
                      <span>All</span>
                      <ValidationStatusIcon status={resolveRowsSummaryStatus(session)} />
                    </span>
                  </SelectItem>
                  <SelectSeparator className="mx-3 my-1 bg-neutral-200" />
                  {adapter.fields.map((field, index) => (
                    <SelectItem
                      key={field.path}
                      value={field.path}
                      checkClassName="hidden"
                      className={cn(
                        'px-4 py-2.5 text-sm text-neutral-500 focus:bg-neutral-50',
                        '[&_.indicator]:hidden',
                        field.path === selectedFieldPath && 'text-neutral-700'
                      )}
                    >
                      <span className="flex text-base w-full items-center justify-between gap-6">
                        <span>{index + 1}</span>
                        <ValidationStatusIcon status={resolveFieldStatus(session, field.path)} />
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
                  <SelectContent className={cn(ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME, 'max-h-40')}>
                    {session.rows.map((row) => (
                      <SelectItem
                        key={row.id}
                        value={row.id}
                        checkClassName="hidden"
                        className={cn(
                          'px-4 py-2.5 text-sm text-neutral-500 focus:bg-neutral-50',
                          '[&_.indicator]:hidden',
                          row.id === session.validatorSelection.rowId && 'text-neutral-700'
                        )}
                      >
                        <span className="flex w-full items-center justify-between gap-6">
                          <span>{row.rowIndex + 1}</span>
                          <ValidationStatusIcon status={resolveRowStatus(row)} />
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto secondary-scrollbar overflow-x-hidden px-3 py-5">
          {showSelectionPrompt ? (
            <Card className="rounded-2xl border border-neutral-200 py-0">
              <CardContent className="px-6 py-8 text-sm text-neutral-500">
                {hasRows
                  ? 'Select a row and column to begin validation.'
                  : 'Add at least one row to begin validating data.'}
              </CardContent>
            </Card>
          ) : isAllColumnsMode && activeRow ? (
            <div className="space-y-4">
              {adapter.fields.map((field, index) => (
                <section key={field.path} aria-label={`Validator box ${field.label}`}>
                  <SingleColumnValidatorCard
                    field={field}
                    row={activeRow}
                    fieldPosition={index}
                    session={session}
                    context={context}
                    actions={actions}
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
              validatorSuggestions={validatorSuggestions}
            />
          ) : null}
        </div>
      </div>

      <Button
        rounded
        type="button"
        size="lg"
        className="w-full mt-auto"
        disabled={!session.summary.canSubmit || isSubmitting}
        onClick={() => void actions.submitRows()}
      >
        {isSubmitting
          ? 'Importing...'
          : `${adapter.submitLabel ?? 'Import'} ${session.rows.length} row(s)`}
      </Button>
    </aside>
  );
}
