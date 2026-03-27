'use client';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { memo, useCallback, useEffect, useId, useRef, useState, useTransition } from 'react';

import {
  CellStatus,
  DependencyState,
  type IImportCellState,
  type IImportRowState,
  type IImportSessionState,
  ImportInputType,
} from '@/features/entity-import/core/contracts';
import {
  buildFileAcceptValue,
  getImportFileButtonLabel,
  getImportFileInputMultiple,
} from '@/features/entity-import/core/file-field';
import {
  formatImportDateDisplayValue,
  importDatePickerChangeToRawValue,
  parseImportDatePickerValue,
} from '@/features/entity-import/core/helpers';
import {
  ENTITY_IMPORT_POPOVER_Z_CLASS,
  ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME,
  getEntityImportSelectLabel,
} from '@/features/entity-import/core/shared/ui';
import { CellStatusBadge } from '@/features/entity-import/ui/cell-status-badge';
import {
  getTableCellUiStatus,
  shouldDisplayCellStatusBadge,
  TableCellUiStatus,
} from '@/features/entity-import/ui/status';
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
import { cn } from '@/utils/css-class';

import type {
  IAdapterFieldDefinition,
  IEntityImportActions,
  IEntityImportRuntimeContext,
  IValidatorDraftValue,
} from '@/features/entity-import/core/adapter';

interface IInlineCellProps {
  field: IAdapterFieldDefinition;
  cell: IImportCellState;
  row: IImportRowState;
  session: IImportSessionState;
  context: IEntityImportRuntimeContext;
  actions: IEntityImportActions;
  selected: boolean;
  validatorPreview: IValidatorDraftValue | null;
}

const INLINE_CELL_DRAFT_COMMIT_DELAY_MS = 250;

function getDisplayValue(cell: IImportCellState): string {
  if (cell.displayValue) {
    return cell.displayValue;
  }

  return cell.rawValue;
}

function resolveTablePreviewValue(
  field: IAdapterFieldDefinition,
  value: Pick<IValidatorDraftValue, 'rawValue' | 'displayValue'>
): string {
  if (field.inputType === ImportInputType.Select) {
    return getEntityImportSelectLabel(field, value.rawValue);
  }

  if (field.inputType === ImportInputType.Date) {
    return formatImportDateDisplayValue(value.rawValue);
  }

  return value.displayValue ?? value.rawValue;
}

function queryTableBodyContainer(root: ParentNode): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>('.rc-virtual-list-holder') ??
    root.querySelector<HTMLElement>('[class*="virtual-holder"]') ??
    root.querySelector<HTMLElement>('.ant-table-body')
  );
}

export const INVALID_CONTROL_CLASSNAME =
  'bg-transparent text-amber-950 [&_textarea]:text-amber-950 bg-amber-50/70 [&_textarea]:bg-amber-50/70';
export const BLOCKED_CONTROL_CLASSNAME =
  'bg-neutral-100 text-neutral-500 [&_textarea]:text-neutral-500 bg-neutral-100 [&_textarea]:bg-neutral-100';

function getControlClassName(cell: IImportCellState, selected: boolean): string {
  const cellUiStatus = getTableCellUiStatus(cell);

  return cn(
    'h-full w-full rounded-none border-0 bg-transparent px-3 py-2 text-base! font-semibold!',
    'placeholder:font-light! placeholder:text-gray-400! text-primary-9! placeholder:text-sm!',
    'shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0',
    { 'text-blue-950': selected },
    {
      'bg-sky-50/70 text-sky-950 [&_textarea]:bg-sky-50/70 [&_textarea]:text-sky-950':
        cellUiStatus === TableCellUiStatus.NeedsSelection,
    },
    {
      [INVALID_CONTROL_CLASSNAME]:
        cellUiStatus !== TableCellUiStatus.NeedsSelection && cell.status === CellStatus.Invalid,
    },
    { [BLOCKED_CONTROL_CLASSNAME]: cell.dependencyState === DependencyState.Blocked }
  );
}

function InlineCellComponent({
  field,
  cell,
  row,
  session,
  context,
  actions,
  selected,
  validatorPreview,
}: IInlineCellProps) {
  const fileInputId = useId();
  const correctionDetailsPopoverId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftCommitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayValue = getDisplayValue(cell);
  const latestCommittedValueRef = useRef(displayValue);
  const draftInputValueRef = useRef(displayValue);
  const hasStatusBadge = shouldDisplayCellStatusBadge(cell);
  const [draftInputValue, setDraftInputValue] = useState(displayValue);
  const [, startCellUpdateTransition] = useTransition();
  const hasValidatorPreview =
    validatorPreview !== null &&
    (validatorPreview.rawValue !== cell.rawValue ||
      (validatorPreview.displayValue ?? null) !== (cell.displayValue ?? null) ||
      !Object.is(validatorPreview.parsedValue, cell.parsedValue));

  useEffect(() => {
    latestCommittedValueRef.current = displayValue;
    draftInputValueRef.current = displayValue;
    setDraftInputValue(displayValue);
  }, [displayValue]);

  useEffect(() => {
    return () => {
      if (draftCommitTimeoutRef.current) {
        clearTimeout(draftCommitTimeoutRef.current);
      }
    };
  }, []);

  const flushDraftInputValue = useCallback(() => {
    if (draftCommitTimeoutRef.current) {
      clearTimeout(draftCommitTimeoutRef.current);
      draftCommitTimeoutRef.current = null;
    }

    const nextRawValue = draftInputValueRef.current;
    if (nextRawValue === latestCommittedValueRef.current) {
      return;
    }

    startCellUpdateTransition(() => {
      actions.updateCellValue({
        rowId: row.id,
        fieldPath: field.path,
        rawValue: nextRawValue,
      });
    });
  }, [actions, field.path, row.id]);

  const scheduleDraftCommit = useCallback(
    (nextRawValue: string) => {
      draftInputValueRef.current = nextRawValue;
      if (draftCommitTimeoutRef.current) {
        clearTimeout(draftCommitTimeoutRef.current);
      }

      draftCommitTimeoutRef.current = setTimeout(
        flushDraftInputValue,
        INLINE_CELL_DRAFT_COMMIT_DELAY_MS
      );
    },
    [flushDraftInputValue]
  );

  const selectCellWithPreservedTableScroll = useCallback(
    (trigger: HTMLElement | null) => {
      const root = trigger?.closest('[data-entity-import-root]') ?? document;
      const scrollTop = queryTableBodyContainer(root)?.scrollTop ?? null;
      if (
        root instanceof HTMLElement &&
        scrollTop !== null &&
        (scrollTop !== 0 || !root.dataset.entityImportScrollTop)
      ) {
        root.dataset.entityImportScrollTop = String(scrollTop);
      }

      actions.selectCell({ rowId: row.id, fieldPath: field.path });

      if (scrollTop === null) {
        return;
      }

      requestAnimationFrame(() => {
        const tableBody = queryTableBodyContainer(root);
        if (tableBody?.isConnected) {
          tableBody.scrollTop = scrollTop;
        }
      });
    },
    [actions, field.path, row.id]
  );

  if (
    field.tableRenderer &&
    field.inputType === ImportInputType.Compound &&
    (cell.correctionDraft || hasValidatorPreview)
  ) {
    return field.tableRenderer({
      field,
      cell,
      row,
      session,
      context,
      actions,
      validatorPreview: hasValidatorPreview ? validatorPreview : null,
    });
  }

  if (hasValidatorPreview && validatorPreview) {
    const previousLabel = resolveTablePreviewValue(field, {
      rawValue: cell.rawValue,
      displayValue: cell.displayValue,
    });
    const previewLabel = resolveTablePreviewValue(field, validatorPreview);

    return (
      <div className="flex min-w-0 w-full flex-col gap-1.5 py-2 px-3">
        <div
          className={cn(
            'min-w-0 w-full wrap-break-word rounded-md border border-amber-600 bg-amber-600/16 ',
            'px-2 py-1.5 text-left text-base font-medium text-amber-950 line-through'
          )}
          title="Original value"
        >
          {previousLabel || '—'}
        </div>
        <p
          className={cn(
            'min-w-0 flex-1 wrap-break-word rounded-xl px-2 py-1.5',
            'text-left text-base font-semibold whitespace-normal text-green-main'
          )}
        >
          {previewLabel || '—'}
        </p>
      </div>
    );
  }

  if (cell.correctionDraft) {
    const draft = cell.correctionDraft;
    const previousLabel = draft.previousDisplayValue ?? draft.previousRawValue;

    return (
      <div className="flex min-w-0 w-full flex-col gap-1.5 py-2 px-3">
        <div
          className={cn(
            'min-w-0 w-full wrap-break-word rounded-md border border-amber-600 bg-amber-600/16',
            'px-2 py-1.5 text-left text-base font-medium text-amber-950 line-through'
          )}
          title="Original value"
        >
          {previousLabel || '—'}
        </div>
        <div className="flex min-w-0 w-full items-center justify-center gap-2">
          <p
            className={cn(
              'min-w-0 flex-1 wrap-break-word rounded-xl px-2 py-1.5',
              'text-left text-base font-semibold whitespace-normal text-green-main'
            )}
          >
            {draft.suggestion.label}
          </p>
          <div className="flex shrink-0 items-center justify-center gap-1">
            <Button
              rounded
              type="button"
              variant="icon"
              className={cn(
                'shrink-0 rounded-full border border-green-main p-0 group hover:bg-green-main',
                'size-6 [&_svg]:size-3!'
              )}
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
              className={cn(
                'shrink-0 rounded-full border border-destructive p-0 group hover:bg-destructive',
                'size-6 [&_svg]:size-3!'
              )}
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
    return (
      <div className="relative h-full w-full">
        {field.tableRenderer({
          field,
          cell,
          row,
          session,
          context,
          actions,
        })}
        <CellStatusBadge
          cell={cell}
          fieldLabel={field.label}
          rowIndex={row.rowIndex + 1}
          onSelect={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
        />
      </div>
    );
  }

  if (field.inputType === ImportInputType.Select) {
    return (
      <div className="pointer-events-none absolute inset-0 box-border min-h-[52px] min-w-0">
        <Select
          data-import-input-type={ImportInputType.Select}
          disabled={cell.dependencyState === 'blocked'}
          value={cell.rawValue}
          onOpenChange={(open) => {
            if (open) {
              const trigger =
                document.activeElement instanceof HTMLElement ? document.activeElement : null;
              selectCellWithPreservedTableScroll(trigger);
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
            data-import-input-type-trigger={`${field.inputType}-select-trigger`}
            className={cn(
              getControlClassName(cell, selected),
              'pointer-events-auto box-border h-11 w-full justify-between rounded-none',
              'border-0 bg-transparent text-left',
              'data-[size=default]:h-full [&_svg]:opacity-100'
            )}
            iconClassName="text-primary-9 border p-1 [&_svg]:size-3 size-5 border-neutral-200 rounded-full"
          >
            <SelectValue
              data-import-input-type-value={`${field.inputType}-select-value`}
              placeholder={field.placeholder ?? `Select ${field.label}`}
            >
              {getEntityImportSelectLabel(field, cell.rawValue) || undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            className={cn(ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME)}
            style={{ width: 'var(--radix-select-trigger-width)' }}
          >
            {field.options?.map((option) => (
              <SelectItem
                data-import-input-type-item={`${field.inputType}-option`}
                key={option.value}
                value={option.value}
                className="w-full text-left h-11 cursor-pointer font-semibold text-primary-9"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CellStatusBadge
          cell={cell}
          fieldLabel={field.label}
          rowIndex={row.rowIndex + 1}
          onSelect={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
        />
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
          className={cn(
            'pointer-events-auto box-border h-full min-h-[52px] w-full justify-center rounded-none',
            'border-0 bg-transparent px-3 py-2 text-left text-sm text-inherit',
            'shadow-none hover:bg-transparent hover:text-inherit',
            getControlClassName(cell, selected)
          )}
          onClick={(event) => {
            selectCellWithPreservedTableScroll(event.currentTarget);
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
        <CellStatusBadge
          cell={cell}
          fieldLabel={field.label}
          rowIndex={row.rowIndex + 1}
          onSelect={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
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
            'pointer-events-auto flex h-full min-h-[52px] w-full flex-col rounded-none ',
            'border-none border-neutral-200 bg-white shadow-none! ring-0!',
            'focus-within:border-none! focus-visible:ring-0! focus-visible:outline-none!',
            '[&_textarea]:box-border [&_textarea]:h-full [&_textarea]:min-h-0! [&_textarea]:flex-1 ',
            '[&_textarea]:resize-none [&_textarea]:rounded-none [&_textarea]:p-2 [&_textarea]:field-sizing-fixed',
            '[&_textarea]:placeholder-shown:content-center',
            '[&_textarea]:placeholder:font-light! [&_textarea]:placeholder:text-gray-400! [&_textarea]:placeholder:text-sm!',
            'focus:border border-neutral-200 bg-white p-2 focus-within:border-primary-6! ',
            { [INVALID_CONTROL_CLASSNAME]: cell.status === CellStatus.Invalid },
            { [BLOCKED_CONTROL_CLASSNAME]: cell.dependencyState === DependencyState.Blocked }
          )}
          disabled={cell.dependencyState === DependencyState.Blocked}
          placeholder={field.placeholder}
          value={draftInputValue}
          onClick={(event) => {
            selectCellWithPreservedTableScroll(event.currentTarget);
          }}
          onChange={(event) => {
            const nextRawValue = event.target.value;
            setDraftInputValue(nextRawValue);
            scheduleDraftCommit(nextRawValue);
          }}
          onBlur={flushDraftInputValue}
        />
        <CellStatusBadge
          cell={cell}
          fieldLabel={field.label}
          rowIndex={row.rowIndex + 1}
          onSelect={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
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
            '[&_.ant-picker-input]:flex [&_.ant-picker-input]:min-h-0 [&_.ant-picker-input]:flex-1 ',
            '[&_.ant-picker-input]:items-center [&_.ant-picker-input>input]:box-border ',
            '[&_.ant-picker-input>input]:h-full [&_.ant-picker-input>input]:min-h-0',
            '[&_input]:placeholder:text-gray-400! [&_input]:placeholder:text-sm!',
            '[&_input]:placeholder:font-light!'
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
          onClick={(event) => {
            selectCellWithPreservedTableScroll(event.currentTarget as HTMLElement);
          }}
          onChange={(date) => {
            actions.updateCellValue({
              rowId: row.id,
              fieldPath: field.path,
              rawValue: importDatePickerChangeToRawValue(date),
            });
          }}
        />
        <CellStatusBadge
          cell={cell}
          fieldLabel={field.label}
          rowIndex={row.rowIndex + 1}
          onSelect={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
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
            hasStatusBadge && 'pr-10'
          )}
          disabled={cell.dependencyState === DependencyState.Blocked}
          placeholder={field.placeholder}
          value={draftInputValue}
          onClick={(event) => {
            selectCellWithPreservedTableScroll(event.currentTarget);
          }}
          onChange={(event) => {
            const nextRawValue = event.target.value;
            setDraftInputValue(nextRawValue);
            scheduleDraftCommit(nextRawValue);
          }}
          onBlur={flushDraftInputValue}
        />
        <CellStatusBadge
          cell={cell}
          fieldLabel={field.label}
          rowIndex={row.rowIndex + 1}
          onSelect={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
        />
      </div>
    </div>
  );
}

function inlineCellPropsAreEqual(previous: IInlineCellProps, next: IInlineCellProps): boolean {
  const shouldCompareFullRow = Boolean(previous.field.tableRenderer || next.field.tableRenderer);
  const rowIsEqual = shouldCompareFullRow
    ? previous.row === next.row
    : previous.row.id === next.row.id && previous.row.rowIndex === next.row.rowIndex;

  return (
    previous.field === next.field &&
    previous.cell === next.cell &&
    rowIsEqual &&
    previous.context === next.context &&
    previous.actions === next.actions &&
    previous.selected === next.selected &&
    previous.validatorPreview === next.validatorPreview
  );
}

export const InlineCell = memo(InlineCellComponent, inlineCellPropsAreEqual);
