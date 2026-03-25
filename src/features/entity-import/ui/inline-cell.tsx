'use client';

import { CheckOutlined, CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { DatePicker } from 'antd';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useId, useRef } from 'react';

import {
  CellStatus,
  DependencyState,
  type IImportCellState,
  type IImportRowState,
  type IImportSessionState,
  ImportInputType,
  RemoteValidationStatus,
} from '@/features/entity-import/core/contracts';
import {
  buildFileAcceptValue,
  getImportFileButtonLabel,
  getImportFileInputMultiple,
} from '@/features/entity-import/core/file-field';
import {
  importDatePickerChangeToRawValue,
  parseImportDatePickerValue,
} from '@/features/entity-import/core/helpers';
import { ENTITY_IMPORT_POPOVER_Z_CLASS } from '@/features/entity-import/ui/entity-import-popover';
import {
  ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME,
  getEntityImportSelectLabel,
} from '@/features/entity-import/ui/select-styles';
import {
  ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
  ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME,
} from '@/features/entity-import/ui/tooltip-styles';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type {
  AdapterFieldDefinition,
  EntityImportActions,
  EntityImportRuntimeContext,
} from '@/features/entity-import/core/adapter';

interface InlineCellProps {
  field: AdapterFieldDefinition;
  cell: IImportCellState;
  row: IImportRowState;
  session: IImportSessionState;
  context: EntityImportRuntimeContext;
  actions: EntityImportActions;
  selected: boolean;
}

function getDisplayValue(cell: IImportCellState): string {
  if (cell.displayValue) {
    return cell.displayValue;
  }

  return cell.rawValue;
}

export const INVALID_CONTROL_CLASSNAME =
  'bg-transparent text-amber-950 [&_textarea]:text-amber-950 bg-amber-50/70 [&_textarea]:bg-amber-50/70';
export const BLOCKED_CONTROL_CLASSNAME =
  'bg-neutral-100 text-neutral-500 [&_textarea]:text-neutral-500 bg-neutral-100 [&_textarea]:bg-neutral-100';

function getControlClassName(cell: IImportCellState, selected: boolean): string {
  return clsx(
    'h-full w-full rounded-none border-0 bg-transparent px-3 py-2 text-base! font-semibold!',
    'placeholder:font-light! placeholder:text-gray-400! text-primary-9! placeholder:text-sm!',
    'shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0',
    selected && 'text-blue-950',
    cell.status === CellStatus.Invalid && INVALID_CONTROL_CLASSNAME,
    cell.dependencyState === DependencyState.Blocked && BLOCKED_CONTROL_CLASSNAME
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
  const correctionDetailsPopoverId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const displayValue = getDisplayValue(cell);
  const showAmbiguousSelectionHint =
    field.inputType === ImportInputType.RemoteSelect &&
    cell.remoteState.status === RemoteValidationStatus.Invalid &&
    cell.remoteState.suggestions.length > 1;

  if (field.tableRenderer && cell.correctionDraft && field.inputType === ImportInputType.Compound) {
    return field.tableRenderer({
      field,
      cell,
      row,
      session,
      context,
      actions,
    });
  }

  if (cell.correctionDraft) {
    const draft = cell.correctionDraft;
    const previousLabel = draft.previousDisplayValue ?? draft.previousRawValue;

    return (
      <div className="flex min-w-0 w-full flex-col gap-1.5 py-2 px-3">
        <div
          className="min-w-0 w-full wrap-break-word rounded-md border border-amber-600 bg-amber-600/16 px-2 py-1.5 text-left text-base font-medium text-amber-950 line-through"
          title="Original value"
        >
          {previousLabel || '—'}
        </div>
        <div className="flex min-w-0 w-full items-center justify-center gap-2">
          <p className="min-w-0 flex-1 wrap-break-word rounded-xl px-2 py-1.5 text-left text-base font-semibold whitespace-normal text-green-main">
            {draft.suggestion.label}
          </p>
          <div className="flex shrink-0 items-center justify-center gap-1">
            <Button
              rounded
              type="button"
              variant="icon"
              className="shrink-0 rounded-full border border-green-main p-0 group hover:bg-green-main  size-6 [&_svg]:size-3!"
              aria-label={`Accept suggested ${field.label} row ${row.rowIndex + 1}`}
              onClick={(event) => {
                event.stopPropagation();
                actions.acceptCorrection({ rowId: row.id, fieldPath: field.path });
              }}
            >
              <CheckOutlined className="text-green-main! group-hover:text-white!" />
            </Button>
            <Button
              rounded
              type="button"
              variant="icon"
              className="shrink-0 rounded-full border border-destructive p-0 group hover:bg-destructive  size-6 [&_svg]:size-3!"
              aria-label={`Reject suggested ${field.label} row ${row.rowIndex + 1}`}
              onClick={(event) => {
                event.stopPropagation();
                actions.rejectCorrection({ rowId: row.id, fieldPath: field.path });
              }}
            >
              <CloseOutlined className="text-destructive! group-hover:text-white!" />
            </Button>
          </div>
        </div>
        <div
          id={correctionDetailsPopoverId}
          popover="auto"
          className={cn(
            'm-0 max-w-sm border border-neutral-200 bg-white p-3 text-sm shadow-lg',
            ENTITY_IMPORT_POPOVER_Z_CLASS
          )}
        >
          <p className="wrap-break-word font-semibold text-green-main">{draft.suggestion.label}</p>
          <p className="mt-2 text-neutral-600">
            Suggested value. Use the checkmark to accept or the cross to reject.
          </p>
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
      <div className="pointer-events-none absolute inset-0 box-border min-h-[52px] min-w-0">
        <Select
          disabled={cell.dependencyState === 'blocked'}
          value={cell.rawValue}
          onOpenChange={(open) => {
            if (open) {
              actions.selectCell({ rowId: row.id, fieldPath: field.path });
            }
          }}
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
              'pointer-events-auto box-border h-full min-h-[52px] w-full justify-start rounded-none border-0 bg-transparent text-left',
              'data-[size=default]:h-full [&_svg]:opacity-100'
            )}
          >
            <SelectValue placeholder={field.placeholder ?? `Select ${field.label}`}>
              {getEntityImportSelectLabel(field, cell.rawValue) || undefined}
            </SelectValue>
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
    );
  }

  if (field.inputType === ImportInputType.File || field.inputType === ImportInputType.FileBundle) {
    return (
      <div className="pointer-events-none absolute inset-0 box-border min-h-[52px] min-w-0">
        <Button
          rounded
          type="button"
          aria-label={`${field.label} row ${row.rowIndex + 1}`}
          variant="ghost"
          size="md"
          className={clsx(
            'pointer-events-auto box-border h-full min-h-[52px] w-full justify-start rounded-none border-0 bg-transparent px-3 py-2 text-left text-sm text-inherit shadow-none hover:bg-transparent hover:text-inherit',
            getControlClassName(cell, selected)
          )}
          onClick={() => {
            actions.selectCell({ rowId: row.id, fieldPath: field.path });
            fileInputRef.current?.click();
          }}
        >
          {displayValue || getImportFileButtonLabel(field)}
        </Button>
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          aria-label={`${field.label} row ${row.rowIndex + 1} file input`}
          accept={buildFileAcceptValue(field.fileConfig)}
          multiple={getImportFileInputMultiple(field)}
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            actions.setFileValue({
              rowId: row.id,
              fieldPath: field.path,
              files,
            });
            event.currentTarget.value = '';
          }}
        />
      </div>
    );
  }

  if (field.inputType === ImportInputType.Textarea) {
    return (
      <div className="pointer-events-none absolute inset-0 box-border min-h-[52px] min-w-0">
        <Textarea
          aria-label={`${field.label} row ${row.rowIndex + 1}`}
          className={cn(
            getControlClassName(cell, selected),
            'pointer-events-auto flex h-full min-h-[52px] w-full flex-col rounded-none border-none border-neutral-200 bg-white shadow-none ring-0',
            'focus-within:border-none! focus-visible:ring-0! focus-visible:outline-none!',
            '[&_textarea]:box-border [&_textarea]:h-full [&_textarea]:min-h-0! [&_textarea]:flex-1 [&_textarea]:resize-none ',
            '[&_textarea]:rounded-none [&_textarea]:p-2 [&_textarea]:field-sizing-fixed',
            '[&_textarea]:placeholder:font-light! [&_textarea]:placeholder:text-gray-400! [&_textarea]:placeholder:text-sm!',
            'focus:border border-neutral-200 bg-white p-2 focus-within:border-primary-6! focus-visible:ring-0! focus-visible:outline-none!',
            'shadow-none! ring-0!',
            cell.status === CellStatus.Invalid && INVALID_CONTROL_CLASSNAME,
            cell.dependencyState === DependencyState.Blocked && BLOCKED_CONTROL_CLASSNAME
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
      </div>
    );
  }

  if (field.inputType === ImportInputType.Date) {
    return (
      <div className="pointer-events-none absolute inset-0 box-border min-h-[52px] min-w-0">
        <DatePicker
          id={`${field.label} row ${row.rowIndex + 1}`}
          aria-label={`${field.label} row ${row.rowIndex + 1}`}
          disabled={cell.dependencyState === DependencyState.Blocked}
          value={parseImportDatePickerValue(cell.rawValue)}
          className={cn(
            getControlClassName(cell, selected),
            'pointer-events-auto flex h-full min-h-[52px] w-full items-stretch text-lg text-primary-9',
            'rounded-none border-none shadow-none outline-none focus-within:border-primary-6',
            '[&_.ant-picker-input]:flex [&_.ant-picker-input]:min-h-0 [&_.ant-picker-input]:flex-1 [&_.ant-picker-input]:items-center',
            '[&_.ant-picker-input>input]:box-border [&_.ant-picker-input>input]:h-full [&_.ant-picker-input>input]:min-h-0',
            '[&_input]:placeholder:text-gray-400! [&_input]:placeholder:text-sm! [&_input]:placeholder:font-light! '
          )}
          styles={{
            root: {
              height: '100%',
              minHeight: '100%',
              display: 'flex',
              alignItems: 'stretch',
            },
          }}
          format="DD/MM/YYYY"
          maxDate={dayjs().endOf('day')}
          onClick={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
          onChange={(date) => {
            actions.updateCellValue({
              rowId: row.id,
              fieldPath: field.path,
              rawValue: importDatePickerChangeToRawValue(date),
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 box-border min-h-[52px] min-w-0">
      <div className="relative h-full w-full">
        <Input
          aria-label={`${field.label} row ${row.rowIndex + 1}`}
          type={field.inputType === ImportInputType.Number ? 'number' : 'text'}
          className={cn(
            getControlClassName(cell, selected),
            'pointer-events-auto box-border h-full min-h-[52px] w-full',
            showAmbiguousSelectionHint && 'pr-10'
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
        {showAmbiguousSelectionHint ? (
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Why ${field.label} row ${row.rowIndex + 1} needs selection`}
                  className={cn(
                    ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
                    'pointer-events-auto text-amber-700'
                  )}
                  onClick={(event) => {
                    event.stopPropagation();
                    actions.selectCell({ rowId: row.id, fieldPath: field.path });
                  }}
                >
                  <InfoCircleOutlined />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="end"
                sideOffset={0}
                arrowClassName="bg-white"
                className={ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME}
              >
                <div className="text-pretty px-1 py-1">
                  Open the validator and choose the correct value for this cell.
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : null}
      </div>
    </div>
  );
}
