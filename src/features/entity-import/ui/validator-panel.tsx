'use client';

import {
  CheckOutlined,
  ExclamationCircleOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { RiSearchLine } from '@remixicon/react';
import { DatePicker } from 'antd';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

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
import { cn } from '@/utils/css-class';

import {
  CellStatus,
  ImportInputType,
  type ImportRowState,
  type ImportSessionState,
  RowStatus,
} from '../core/contracts';
import {
  formatImportDateDisplayValue,
  importDatePickerChangeToRawValue,
  parseImportDatePickerValue,
} from '../core/helpers';
import { ENTITY_IMPORT_POPOVER_Z_CLASS } from './entity-import-popover';

import type {
  AdapterFieldDefinition,
  EntityImportActions,
  EntityImportAdapter,
  EntityImportRuntimeContext,
  ValidatorDraftValue,
} from '../core/adapter';

interface ValidatorPanelProps<TPayload, TResult> {
  adapter: EntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  session: ImportSessionState;
  actions: EntityImportActions;
  isSubmitting: boolean;
}

const ValidatorFieldStatus = {
  Idle: 'idle',
  Valid: 'valid',
  Warning: 'warning',
} as const;

type TValidatorFieldStatus = (typeof ValidatorFieldStatus)[keyof typeof ValidatorFieldStatus];

function resolveFieldStatus(session: ImportSessionState, fieldPath: string): TValidatorFieldStatus {
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

function resolveActiveRow(session: ImportSessionState): ImportRowState | null {
  if (session.selectedCell) {
    return session.rows.find((row) => row.id === session.selectedCell?.rowId) ?? null;
  }
  return session.rows[0] ?? null;
}

function resolveActiveField<TPayload, TResult>(
  adapter: EntityImportAdapter<TPayload, TResult>,
  session: ImportSessionState
): AdapterFieldDefinition | null {
  if (session.selectedCell) {
    return adapter.fields.find((field) => field.path === session.selectedCell?.fieldPath) ?? null;
  }
  return adapter.fields[0] ?? null;
}

function resolveRowStatus(row: ImportRowState): TValidatorFieldStatus {
  if (row.rowStatus === RowStatus.Invalid) {
    return ValidatorFieldStatus.Warning;
  }

  if (row.rowStatus === RowStatus.Valid) {
    return ValidatorFieldStatus.Valid;
  }

  return ValidatorFieldStatus.Idle;
}

function resolveRowsSummaryStatus(session: ImportSessionState): TValidatorFieldStatus {
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
  cell: ImportSessionState['rows'][number]['cells'][string]
): ValidatorDraftValue {
  return {
    rawValue: cell.rawValue,
    displayValue: cell.displayValue ?? null,
    parsedValue: cell.parsedValue,
  };
}

function resolveValidatorDisplayValue(
  field: AdapterFieldDefinition,
  draftValue: ValidatorDraftValue
): string {
  if (field.inputType === ImportInputType.Date) {
    return formatImportDateDisplayValue(draftValue.rawValue);
  }

  return draftValue.displayValue ?? draftValue.rawValue;
}

export function ValidatorPanel<TPayload, TResult>({
  adapter,
  context,
  session,
  actions,
  isSubmitting,
}: ValidatorPanelProps<TPayload, TResult>) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previousSelectionKeyRef = useRef<string>('');
  const activeRow = resolveActiveRow(session);
  const activeField = resolveActiveField(adapter, session);
  const activeCell = activeRow && activeField ? activeRow.cells[activeField.path] : null;
  const selectedSuggestion = activeCell?.remoteState.selectedSuggestion ?? null;
  const rowPosition = activeRow ? session.rows.findIndex((row) => row.id === activeRow.id) : -1;
  const fieldPosition = activeField
    ? adapter.fields.findIndex((field) => field.path === activeField.path)
    : -1;
  const selectionKey = activeRow && activeField ? `${activeRow.id}:${activeField.path}` : '';
  const [draftValue, setDraftValue] = useState<ValidatorDraftValue>(() =>
    activeCell
      ? createValidatorDraftValue(activeCell)
      : {
          rawValue: '',
          displayValue: null,
          parsedValue: '',
        }
  );
  const [hasPendingManualChange, setHasPendingManualChange] = useState(false);

  useEffect(() => {
    if (previousSelectionKeyRef.current === selectionKey) {
      return;
    }

    previousSelectionKeyRef.current = selectionKey;
    setDraftValue(
      activeCell
        ? createValidatorDraftValue(activeCell)
        : {
            rawValue: '',
            displayValue: null,
            parsedValue: '',
          }
    );
    setHasPendingManualChange(false);
  }, [activeCell, selectionKey]);

  useEffect(() => {
    if (!activeCell || selectedSuggestion || hasPendingManualChange) {
      return;
    }

    setDraftValue(createValidatorDraftValue(activeCell));
  }, [activeCell, hasPendingManualChange, selectedSuggestion]);

  const updateDraftValue = useCallback((nextValue: ValidatorDraftValue) => {
    setDraftValue(nextValue);
    setHasPendingManualChange(true);
  }, []);

  const commitManualValueToRow = useCallback(
    (rowId: string) => {
      if (!activeField) {
        return;
      }

      if (
        activeField.inputType === ImportInputType.File ||
        activeField.inputType === ImportInputType.FileBundle
      ) {
        actions.setFileValue({
          rowId,
          fieldPath: activeField.path,
          file: (draftValue.parsedValue as File | null) ?? null,
          displayValue: draftValue.displayValue,
        });
        return;
      }

      if (activeField.inputType === ImportInputType.RemoteSelect) {
        actions.updateCellValue({
          rowId,
          fieldPath: activeField.path,
          rawValue: draftValue.rawValue,
        });
        return;
      }

      actions.setCustomValue({
        rowId,
        fieldPath: activeField.path,
        rawValue: draftValue.rawValue,
        displayValue: draftValue.displayValue,
        parsedValue: draftValue.parsedValue,
      });
    },
    [actions, activeField, draftValue]
  );

  const handleApply = useCallback(
    (applyToAll: boolean) => {
      if (!activeField || !activeRow || !activeCell) {
        return;
      }

      if (selectedSuggestion) {
        actions.applySuggestion({
          fieldPath: activeField.path,
          targetRowId: activeRow.id,
          sourceValue: activeCell.rawValue,
          suggestion: selectedSuggestion,
          applyToAllMatching: applyToAll,
        });
        setHasPendingManualChange(false);
        return;
      }

      const targetRows = applyToAll ? session.rows : [activeRow];
      targetRows.forEach((row) => {
        commitManualValueToRow(row.id);
      });
      setHasPendingManualChange(false);
    },
    [
      actions,
      activeCell,
      activeField,
      activeRow,
      commitManualValueToRow,
      selectedSuggestion,
      session.rows,
    ]
  );

  const previewValue = activeField ? resolveValidatorDisplayValue(activeField, draftValue) : '';

  const goNeighborRow = (delta: number) => {
    if (!activeField) {
      return;
    }

    const nextIndex = rowPosition + delta;
    if (nextIndex < 0 || nextIndex >= session.rows.length) {
      return;
    }

    actions.selectCell({
      rowId: session.rows[nextIndex].id,
      fieldPath: activeField.path,
    });
  };

  if (!activeRow || !activeField || !activeCell) {
    return (
      <aside className="rounded-3xl border border-neutral-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-neutral-900">Validator</h3>
        <p className="mt-3 text-sm text-neutral-500">
          Add at least one row to begin validating data.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white">
      <div className="shrink-0 px-5 py-4 text-white">
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
              value={activeField.path}
              onValueChange={(fieldPath) => actions.selectCell({ rowId: activeRow.id, fieldPath })}
            >
              <SelectTrigger
                id="validator-column-select"
                aria-label="Select column"
                className="h-8 min-w-20 justify-self-end rounded-full border-2 border-gray-200 bg-transparent text-left text-sm font-medium text-primary-9 shadow-none data-placeholder:text-white/75 [&_svg]:text-[#0b4dbb] [&_svg]:opacity-100"
              >
                <span>{fieldPosition >= 0 ? `Column ${fieldPosition + 1}` : 'Select'}</span>
              </SelectTrigger>
              <SelectContent
                className={cn(
                  ENTITY_IMPORT_POPOVER_Z_CLASS,
                  'border border-neutral-200 bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.16)]',
                  'max-h-80'
                )}
              >
                {adapter.fields.map((field, index) => (
                  <SelectItem
                    key={field.path}
                    value={field.path}
                    checkClassName="hidden"
                    className={cn(
                      'px-4 py-2.5 text-sm text-neutral-500 focus:bg-neutral-50',
                      '[&_.indicator]:hidden',
                      field.path === activeField.path && 'text-neutral-700'
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex min-w-max items-center justify-center rounded-full px-4 text-sm font-semibold text-primary-9 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
              >
                All
              </Button>

              <Select
                value={undefined}
                onValueChange={(rowId) => {
                  if (rowId === '__all__') {
                    return;
                  }
                  actions.selectCell({ rowId, fieldPath: activeField.path });
                }}
              >
                <SelectTrigger
                  id="validator-row-select"
                  aria-label="Select row"
                  className="h-8 min-w-20 justify-self-end rounded-full border-2 border-gray-200 bg-transparent text-left text-sm font-medium text-primary-9 shadow-none data-placeholder:text-white/75 [&_svg]:text-[#0b4dbb] [&_svg]:opacity-100"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent
                  className={cn(
                    ENTITY_IMPORT_POPOVER_Z_CLASS,
                    'border border-neutral-200 bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.16)]',
                    'max-h-40'
                  )}
                >
                  <SelectItem
                    value="__all__"
                    checkClassName="hidden"
                    className={cn(
                      'px-4 py-2.5 text-sm text-neutral-500 focus:bg-neutral-50',
                      '[&_.indicator]:hidden'
                    )}
                  >
                    <span className="flex w-full items-center justify-between gap-6">
                      <span>All</span>
                      <ValidationStatusIcon status={resolveRowsSummaryStatus(session)} />
                    </span>
                  </SelectItem>
                  <SelectSeparator className="mx-3 my-1 bg-neutral-200" />
                  {session.rows.map((row) => (
                    <SelectItem
                      key={row.id}
                      value={row.id}
                      checkClassName="hidden"
                      className={cn(
                        'px-4 py-2.5 text-sm text-neutral-500 focus:bg-neutral-50',
                        '[&_.indicator]:hidden',
                        row.id === activeRow.id && 'text-neutral-700'
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

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-5 py-5">
        <Card className="rounded-2xl border border-neutral-200 py-0">
          <CardContent className="space-y-4 py-4 px-0">
            <div className="flex items-start justify-between gap-3 px-4">
              <p className="text-base text-left font-bold uppercase tracking-wide text-primary-9">
                {activeField.label}
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
                Row {activeRow.rowIndex + 1} of {session.rows.length}
              </p>
            </div>

            <div className="px-4">
              {activeField.required && (
                <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                  Required
                </span>
              )}
            </div>

            {/* {activeCell.correctionDraft && (
              <Alert appearance="light" variant="info" className="px-4">
                <AlertContent>
                  <AlertDescription>
                    Use the accept or reject controls in the table cell to finish this correction.
                  </AlertDescription>
                </AlertContent>
              </Alert>
            )} */}

            {activeField.panelRenderer?.({
              field: activeField,
              cell: activeCell,
              row: activeRow,
              session,
              context,
              actions,
              suggestions: activeCell.remoteState.suggestions,
              draftValue,
              onDraftChange: updateDraftValue,
            })}

            <div className="px-4">
              {!activeField.panelRenderer &&
                activeField.inputType === ImportInputType.RemoteSelect && (
                  <div
                    className={cn(
                      'pr-4 pl-0 flex items-center gap-2 ',
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
                        updateDraftValue({
                          rawValue: event.target.value,
                          displayValue: null,
                          parsedValue: event.target.value,
                        });
                        actions.updateCellValue({
                          rowId: activeRow.id,
                          fieldPath: activeField.path,
                          rawValue: event.target.value,
                        });
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <RiSearchLine className="text-primary-9 size-5 group-focus-within:text-primary-6 group-focus-within:scale-110 transition-all duration-100" />
                    </div>
                  </div>
                )}
              {!activeField.panelRenderer && activeField.inputType === ImportInputType.Textarea && (
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

              {!activeField.panelRenderer && activeField.inputType === ImportInputType.Date && (
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

              {!activeField.panelRenderer && (
                <div className="space-y-4 px-4">
                  {(activeField.inputType === ImportInputType.Text ||
                    activeField.inputType === ImportInputType.Number) && (
                    <Input
                      id="validator-value"
                      aria-label="Validator value"
                      type={activeField.inputType === ImportInputType.Number ? 'number' : 'text'}
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

                  {activeField.inputType === ImportInputType.Select && (
                    <div>
                      <Select
                        value={draftValue.rawValue || undefined}
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
                          className="w-full rounded-xl"
                        >
                          <SelectValue
                            placeholder={activeField.placeholder ?? `Select ${activeField.label}`}
                          />
                        </SelectTrigger>
                        <SelectContent className={ENTITY_IMPORT_POPOVER_Z_CLASS}>
                          {activeField.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(activeField.inputType === ImportInputType.File ||
                    activeField.inputType === ImportInputType.FileBundle) && (
                    <div>
                      <Button
                        rounded
                        type="button"
                        variant="outline"
                        size="md"
                        className="w-full justify-start text-left"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {(draftValue.displayValue ?? draftValue.rawValue) || 'Attach file'}
                      </Button>
                      <input
                        ref={fileInputRef}
                        id={fileInputId}
                        type="file"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0] ?? null;
                          updateDraftValue({
                            rawValue: file?.name ?? '',
                            displayValue: file?.name ?? null,
                            parsedValue: file,
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4">
              {/* {activeCell.issues.length > 0 && (
                <Alert appearance="light" variant="warning">
                  <AlertContent>
                    <AlertDescription>{activeCell.issues[0]}</AlertDescription>
                  </AlertContent>
                </Alert>
              )}
 */}
              {/*  {activeCell.issues.length === 0 && activeCell.remoteState.message && (
                <Alert appearance="light" variant="info">
                  <AlertContent>
                    <AlertDescription>{activeCell.remoteState.message}</AlertDescription>
                  </AlertContent>
                </Alert>
              )} */}
            </div>

            {activeCell.remoteState.suggestions.length > 0 && (
              <div className="space-y-2 px-4 flex flex-col gap-1.5">
                {activeCell.remoteState.suggestions.map((suggestion) => {
                  const isSelected = selectedSuggestion?.value === suggestion.value;
                  return (
                    <Button
                      key={suggestion.value}
                      type="button"
                      aria-label={`Select suggestion ${suggestion.label}`}
                      variant="outline"
                      className={cn(
                        'h-auto rounded-xl min-w-0 w-full justify-between gap-3 whitespace-normal px-3 py-3 text-left text-base transition',
                        isSelected
                          ? 'border-green-main text-green-main bg-green-main/10'
                          : 'border-neutral-200 hover:border-neutral-300'
                      )}
                      onClick={() =>
                        actions.chooseSuggestion({
                          rowId: activeRow.id,
                          fieldPath: activeField.path,
                          suggestion,
                        })
                      }
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <span className="block font-medium wrap-break-word whitespace-normal">
                          {suggestion.label}
                        </span>
                        {suggestion.recommended && (
                          <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          'shrink-0 border border-neutral-200 rounded-full size-6! p-2 flex items-center justify-center',
                          isSelected
                            ? 'border-green-main bg-green-main text-white'
                            : 'border-neutral-200 hover:border-neutral-300'
                        )}
                      >
                        {isSelected && <CheckOutlined className="opacity-100" />}
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}

            {(activeField.remote?.searchPage ?? activeField.remote?.search) &&
              (activeCell.remoteState.suggestionPaging?.hasNextPage ||
                activeCell.remoteState.suggestionPaging?.isFetchingNextPage) && (
                <div className="px-4">
                  <Button
                    rounded
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-sm text-primary-9"
                    disabled={activeCell.remoteState.suggestionPaging?.isFetchingNextPage}
                    onClick={() => actions.loadMoreSuggestions()}
                  >
                    {activeCell.remoteState.suggestionPaging?.isFetchingNextPage
                      ? 'Loading…'
                      : 'Load more'}
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
                  disabled={Boolean(activeCell.correctionDraft)}
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
                  disabled={Boolean(activeCell.correctionDraft)}
                  onClick={() => handleApply(false)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-4">
        <Button
          rounded
          type="button"
          size="lg"
          className="w-full"
          disabled={!session.summary.canSubmit || isSubmitting}
          onClick={() => void actions.submitRows()}
        >
          {isSubmitting
            ? 'Importing...'
            : `${adapter.submitLabel ?? 'Import'} ${session.rows.length} row(s)`}
        </Button>
      </div>
    </aside>
  );
}
