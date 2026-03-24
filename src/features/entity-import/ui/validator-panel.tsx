'use client';

import { CheckOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import { useId, useRef } from 'react';

import { Alert, AlertContent, AlertDescription } from '@/ui/molecules/alert';
import { Button } from '@/ui/molecules/button';
import { Card, CardContent } from '@/ui/molecules/card';
import { Input } from '@/ui/molecules/input';
import { Textarea } from '@/ui/molecules/input/text-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';

import {
  CellStatus,
  ImportInputType,
  type ImportRowState,
  type ImportSessionState,
  RowStatus,
} from '../core/contracts';

import type {
  AdapterFieldDefinition,
  EntityImportActions,
  EntityImportAdapter,
  EntityImportRuntimeContext,
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

function StatusDot({ status }: { status: TValidatorFieldStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex h-2.5 w-2.5 rounded-full',
        status === ValidatorFieldStatus.Valid && 'bg-emerald-500',
        status === ValidatorFieldStatus.Warning && 'bg-amber-500',
        status === ValidatorFieldStatus.Idle && 'bg-neutral-300'
      )}
    />
  );
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
  const activeRow = resolveActiveRow(session);
  const activeField = resolveActiveField(adapter, session);

  if (!activeRow || !activeField) {
    return (
      <aside className="rounded-3xl border border-neutral-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-neutral-900">Validator</h3>
        <p className="mt-3 text-sm text-neutral-500">
          Add at least one row to begin validating data.
        </p>
      </aside>
    );
  }

  const activeCell = activeRow.cells[activeField.path];
  const selectedSuggestion = activeCell.remoteState.selectedSuggestion;

  return (
    <aside className="flex h-full flex-col rounded-3xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h3 className="text-lg font-semibold text-neutral-900">Validator</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Review one column and row at a time, then apply corrections in place.
        </p>
      </div>

      <div className="space-y-5 overflow-auto px-5 py-5">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Columns
          </p>
          <div className="flex flex-wrap gap-2">
            {adapter.fields.map((field, index) => {
              const status = resolveFieldStatus(session, field.path);
              return (
                <Button
                  rounded
                  key={field.path}
                  type="button"
                  variant="outline"
                  active={field.path === activeField.path}
                  className={clsx(
                    'h-10 gap-2 px-3 text-sm',
                    field.path === activeField.path && 'border-blue-500 text-blue-700'
                  )}
                  onClick={() => actions.selectCell({ rowId: activeRow.id, fieldPath: field.path })}
                >
                  <span>{index + 1}</span>
                  <StatusDot status={status} />
                </Button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Rows
          </p>
          <Select
            value={activeRow.id}
            onValueChange={(rowId) => actions.selectCell({ rowId, fieldPath: activeField.path })}
          >
            <SelectTrigger id="validator-row-select" className="w-full rounded-xl">
              <SelectValue placeholder="Select row" />
            </SelectTrigger>
            <SelectContent>
              {session.rows.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {`Row ${row.rowIndex + 1}${
                    row.rowStatus === RowStatus.Valid
                      ? ' ✓'
                      : row.rowStatus === RowStatus.Invalid
                        ? ' ⚠'
                        : ''
                  }`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <Card className="rounded-2xl border border-neutral-200 py-0">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Selected field
                </p>
                <h4 className="mt-1 text-base font-semibold text-neutral-900">
                  {activeField.label}
                </h4>
                <p className="mt-1 text-sm text-neutral-500">Row {activeRow.rowIndex + 1}</p>
              </div>
              {activeField.required && (
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                  Required
                </span>
              )}
            </div>

            {activeField.panelRenderer ? (
              <div>
                {activeField.panelRenderer({
                  field: activeField,
                  cell: activeCell,
                  row: activeRow,
                  session,
                  context,
                  actions,
                  suggestions: activeCell.remoteState.suggestions,
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {(activeField.inputType === ImportInputType.Text ||
                  activeField.inputType === ImportInputType.Textarea ||
                  activeField.inputType === ImportInputType.RemoteSelect ||
                  activeField.inputType === ImportInputType.Date ||
                  activeField.inputType === ImportInputType.Number) && (
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-neutral-700"
                      htmlFor="validator-value"
                    >
                      Current value
                    </label>
                    {activeField.inputType === ImportInputType.Textarea ? (
                      <Textarea
                        id="validator-value"
                        aria-label="Validator value"
                        value={activeCell.displayValue ?? activeCell.rawValue}
                        onChange={(event) => {
                          actions.updateCellValue({
                            rowId: activeRow.id,
                            fieldPath: activeField.path,
                            rawValue: event.target.value,
                          });
                        }}
                      />
                    ) : (
                      <Input
                        id="validator-value"
                        aria-label="Validator value"
                        type={
                          activeField.inputType === ImportInputType.Date
                            ? 'date'
                            : activeField.inputType === ImportInputType.Number
                              ? 'number'
                              : 'text'
                        }
                        className="h-11"
                        value={activeCell.displayValue ?? activeCell.rawValue}
                        onChange={(event) => {
                          actions.updateCellValue({
                            rowId: activeRow.id,
                            fieldPath: activeField.path,
                            rawValue: event.target.value,
                          });
                        }}
                      />
                    )}
                  </div>
                )}

                {activeField.inputType === ImportInputType.Select && (
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-neutral-700"
                      htmlFor="validator-select"
                    >
                      Current value
                    </label>
                    <Select
                      value={activeCell.rawValue || undefined}
                      onValueChange={(value) =>
                        actions.updateCellValue({
                          rowId: activeRow.id,
                          fieldPath: activeField.path,
                          rawValue: value,
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
                      <SelectContent>
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
                    <label
                      className="mb-2 block text-sm font-medium text-neutral-700"
                      htmlFor={fileInputId}
                    >
                      Current file
                    </label>
                    <Button
                      rounded
                      type="button"
                      variant="outline"
                      size="md"
                      className="w-full justify-start text-left"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {(activeCell.displayValue ?? activeCell.rawValue) || 'Attach file'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      id={fileInputId}
                      type="file"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0] ?? null;
                        actions.setFileValue({
                          rowId: activeRow.id,
                          fieldPath: activeField.path,
                          file,
                        });
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {activeCell.issues.length > 0 && (
              <Alert appearance="light" variant="warning">
                <AlertContent>
                  <AlertDescription>{activeCell.issues[0]}</AlertDescription>
                </AlertContent>
              </Alert>
            )}

            {activeCell.issues.length === 0 && activeCell.remoteState.message && (
              <Alert appearance="light" variant="info">
                <AlertContent>
                  <AlertDescription>{activeCell.remoteState.message}</AlertDescription>
                </AlertContent>
              </Alert>
            )}

            {activeCell.remoteState.suggestions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Suggestions
                </p>
                <div className="space-y-2">
                  {activeCell.remoteState.suggestions.map((suggestion) => {
                    const isSelected = selectedSuggestion?.value === suggestion.value;
                    return (
                      <Button
                        key={suggestion.value}
                        type="button"
                        aria-label={`Select suggestion ${suggestion.label}`}
                        variant="outline"
                        className={clsx(
                          'flex h-auto w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
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
                        <span className="flex items-center gap-2 font-medium">
                          <CheckOutlined
                            className={clsx(isSelected ? 'opacity-100' : 'opacity-20')}
                          />
                          {suggestion.label}
                        </span>
                        {suggestion.recommended && (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                            Recommended
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-auto border-t border-neutral-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <Button
            rounded
            type="button"
            variant="outline"
            size="md"
            className="flex-1"
            disabled={!selectedSuggestion}
            onClick={() =>
              selectedSuggestion &&
              actions.applySuggestion({
                fieldPath: activeField.path,
                targetRowId: activeRow.id,
                sourceValue: activeCell.rawValue,
                suggestion: selectedSuggestion,
                applyToAllMatching: false,
              })
            }
          >
            Apply
          </Button>
          <Button
            rounded
            type="button"
            size="md"
            className="flex-1"
            disabled={!selectedSuggestion}
            onClick={() =>
              selectedSuggestion &&
              actions.applySuggestion({
                fieldPath: activeField.path,
                targetRowId: activeRow.id,
                sourceValue: activeCell.rawValue,
                suggestion: selectedSuggestion,
                applyToAllMatching: true,
              })
            }
          >
            Apply to all
          </Button>
        </div>
        <Button
          rounded
          type="button"
          size="lg"
          className="mt-3 w-full"
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
