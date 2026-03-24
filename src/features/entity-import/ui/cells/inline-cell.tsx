'use client';

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
} from '../../core/contracts';

import type {
  AdapterFieldDefinition,
  EntityImportActions,
  EntityImportRuntimeContext,
} from '../../core/adapter';

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
    'w-full rounded-xl',
    selected && 'border-blue-500 shadow-sm',
    cell.status === CellStatus.Invalid && 'border-amber-500 text-amber-950',
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
          className={getControlClassName(cell, selected)}
        >
          <SelectValue placeholder={field.placeholder ?? `Select ${field.label}`} />
        </SelectTrigger>
        <SelectContent>
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
          variant="outline"
          size="md"
          className={clsx('justify-start text-left', getControlClassName(cell, selected))}
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

  return (
    <Input
      aria-label={`${field.label} row ${row.rowIndex + 1}`}
      type={
        field.inputType === ImportInputType.Date
          ? 'date'
          : field.inputType === ImportInputType.Number
            ? 'number'
            : 'text'
      }
      className={clsx('h-11 px-3 py-2 text-sm', getControlClassName(cell, selected))}
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
