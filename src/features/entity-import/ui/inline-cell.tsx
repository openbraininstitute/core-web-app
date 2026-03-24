'use client';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { DatePicker } from 'antd';
import clsx from 'clsx';
import { useId, useRef } from 'react';

import { Button } from '@/ui/molecules/button';
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
  DependencyState,
  type ImportCellState,
  ImportInputType,
  type ImportRowState,
  type ImportSessionState,
  RemoteValidationStatus,
} from '../core/contracts';
import { ENTITY_IMPORT_POPOVER_Z_CLASS } from './entity-import-popover';
import { importDatePickerChangeToRawValue, parseImportDatePickerValue } from './import-date';

import type {
  AdapterFieldDefinition,
  EntityImportActions,
  EntityImportRuntimeContext,
} from '../core/adapter';

interface InlineCellProps {
  field: AdapterFieldDefinition;
  cell: ImportCellState;
  row: ImportRowState;
  session: ImportSessionState;
  context: EntityImportRuntimeContext;
  actions: EntityImportActions;
  selected: boolean;
}

function getDisplayValue(cell: ImportCellState): string {
  if (cell.displayValue) {
    return cell.displayValue;
  }

  return cell.rawValue;
}

function getControlClassName(cell: ImportCellState, selected: boolean): string {
  return clsx(
    'h-full min-h-[52px] w-full rounded-none border-0 bg-transparent px-3 py-2 text-sm shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0',
    selected && 'text-blue-950',
    cell.status === CellStatus.Invalid && 'bg-transparent text-amber-950',
    cell.remoteState.status === RemoteValidationStatus.Invalid && 'line-through',
    cell.dependencyState === DependencyState.Blocked && 'bg-neutral-100 text-neutral-500'
  );
}

export function InlineCell({
  field,
  cell,
  row,
  session,
  context,
  actions,
  selected,
}: InlineCellProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const displayValue = getDisplayValue(cell);

  if (cell.correctionDraft) {
    const draft = cell.correctionDraft;
    const previousLabel = draft.previousDisplayValue ?? draft.previousRawValue;

    return (
      <div className="flex flex-col gap-1.5 py-0.5 items-center justify-center">
        <div
          className="rounded-md border border-amber-600 bg-amber-600/16 px-4 py-1.5 text-base font-medium text-amber-950 w-90percent"
          title="Original value"
        >
          {previousLabel || '—'}
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <div
            className="rounded-xl px-2 py-1.5 text-base! font-semibold text-green-main"
            title="Suggested value (click to accept or reject)"
          >
            {draft.suggestion.label}
          </div>

          <div className="flex justify-end gap-1">
            <Button
              rounded
              type="button"
              variant="icon"
              size="sm"
              className="shrink-0 p-0 border rounded-full border-green-main group hover:bg-green-main"
              aria-label={`Accept suggested ${field.label} row ${row.rowIndex + 1}`}
              onClick={() => actions.acceptCorrection({ rowId: row.id, fieldPath: field.path })}
            >
              <CheckOutlined className="text-green-main! group-hover:text-white!" />
            </Button>
            <Button
              rounded
              type="button"
              variant="icon"
              size="sm"
              className="shrink-0 p-0 border rounded-full border-destructive group hover:bg-destructive"
              aria-label={`Reject suggested ${field.label} row ${row.rowIndex + 1}`}
              onClick={() => actions.rejectCorrection({ rowId: row.id, fieldPath: field.path })}
            >
              <CloseOutlined className="text-destructive! group-hover:text-white!" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (field.tableRenderer) {
    return field.tableRenderer({
      field,
      cell,
      row,
      session,
      context,
      actions,
    });
  }

  if (field.inputType === ImportInputType.Select) {
    return (
      <Select
        disabled={cell.dependencyState === 'blocked'}
        value={cell.rawValue || undefined}
        onOpenChange={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
        onValueChange={(value) =>
          actions.updateCellValue({
            rowId: row.id,
            fieldPath: field.path,
            rawValue: value,
          })
        }
      >
        <SelectTrigger
          aria-label={`${field.label} row ${row.rowIndex + 1}`}
          className={clsx(
            getControlClassName(cell, selected),
            'data-[size=default]:h-full [&_svg]:opacity-100'
          )}
        >
          <SelectValue placeholder={field.placeholder ?? `Select ${field.label}`} />
        </SelectTrigger>
        <SelectContent className={ENTITY_IMPORT_POPOVER_Z_CLASS}>
          {field.options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.inputType === ImportInputType.File || field.inputType === ImportInputType.FileBundle) {
    return (
      <div className="flex items-center gap-2">
        <Button
          rounded
          type="button"
          aria-label={`${field.label} row ${row.rowIndex + 1}`}
          variant="ghost"
          size="md"
          className={clsx(
            'h-full min-h-[52px] justify-start rounded-none border-0 bg-transparent px-3 py-2 text-left text-sm text-inherit shadow-none hover:bg-transparent hover:text-inherit',
            getControlClassName(cell, selected)
          )}
          onClick={() => {
            actions.selectCell({ rowId: row.id, fieldPath: field.path });
            fileInputRef.current?.click();
          }}
        >
          {displayValue || field.placeholder || 'Attach file'}
        </Button>
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            actions.setFileValue({
              rowId: row.id,
              fieldPath: field.path,
              file,
            });
          }}
        />
      </div>
    );
  }

  if (field.inputType === ImportInputType.Textarea) {
    return (
      <Textarea
        aria-label={`${field.label} row ${row.rowIndex + 1}`}
        className={clsx(
          getControlClassName(cell, selected),
          'rounded-none border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0'
        )}
        disabled={cell.dependencyState === DependencyState.Blocked}
        placeholder={field.placeholder}
        value={displayValue}
        onClick={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
        onChange={(event) =>
          actions.updateCellValue({
            rowId: row.id,
            fieldPath: field.path,
            rawValue: event.target.value,
          })
        }
      />
    );
  }

  if (field.inputType === ImportInputType.Date) {
    return (
      <DatePicker
        id={`${field.label} row ${row.rowIndex + 1}`}
        aria-label={`${field.label} row ${row.rowIndex + 1}`}
        value={parseImportDatePickerValue(cell.rawValue)}
        className="h-11 text-lg! rounded-full text-primary-9! focus-within:border-primary-6 w-full"
        format="DD/MM/YYYY"
        onChange={(date) => {
          actions.updateCellValue({
            rowId: row.id,
            fieldPath: field.path,
            rawValue: importDatePickerChangeToRawValue(date),
          });
        }}
      />
    );
  }

  return (
    <Input
      aria-label={`${field.label} row ${row.rowIndex + 1}`}
      type={field.inputType === ImportInputType.Number ? 'number' : 'text'}
      className={getControlClassName(cell, selected)}
      disabled={cell.dependencyState === DependencyState.Blocked}
      placeholder={field.placeholder}
      value={displayValue}
      onClick={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
      onChange={(event) =>
        actions.updateCellValue({
          rowId: row.id,
          fieldPath: field.path,
          rawValue: event.target.value,
        })
      }
    />
  );
}
