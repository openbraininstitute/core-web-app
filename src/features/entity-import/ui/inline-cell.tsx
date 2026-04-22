'use client';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';

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
  BLOCKED_CONTROL_CLASSNAME,
  formatImportDateDisplayValue,
  getControlClassName,
  getDisplayValue,
  INLINE_CELL_DRAFT_COMMIT_DELAY_MS,
  INVALID_CONTROL_CLASSNAME,
  importDatePickerChangeToRawValue,
  parseImportDatePickerValue,
} from '@/features/entity-import/core/shared/helpers';
import {
  ENTITY_IMPORT_POPOVER_Z_CLASS,
  ENTITY_IMPORT_SELECT_MENU_ITEM_CLASSNAME,
  ENTITY_IMPORT_SELECT_MENU_PANEL_CLASSNAME,
  getEntityImportSelectLabel,
} from '@/features/entity-import/core/shared/ui';
import { CellStatusBadge } from '@/features/entity-import/ui/cell-status-badge';
import { shouldDisplayCellStatusBadge } from '@/features/entity-import/ui/status';
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
  if (field.path === 'repairPipelineState') {
    console.log('–– – inline-cell.tsx:95 – InlineCellComponent – field:', field);
  }

  const fileInputId = useId();
  const correctionDetailsPopoverId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftCommitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayValue = getDisplayValue(cell);
  const hasStatusBadge = shouldDisplayCellStatusBadge(cell);

  // the input is (uncontrolled-ish), local state (draftInputValue) drives
  // the input's (value) prop so keystrokes are reflected immediately. A
  // 250ms debounce commits the draft to the session via (updateCellValue)
  //
  // the tricky part is the sync effect that reconciles the local draft with
  // the committed cell value. two rules:
  //
  // 1. when we commit a value (via the debounce), the session will update
  //    and `displayValue` will change to match what we sent. We must NOT
  //    reset the draft in that case — the user may have typed more since.
  //
  // 2. when an external source changes the cell (csv upload, suggestion
  //    resolution, validator apply, clear row), (displayValue) will differ
  //    from what we last committed. we must reset the draft to pick up the
  //    external change
  //
  // `lastFlushedValueRef` tracks what we last sent to (updateCellValue)
  // the sync effect compares incoming `displayValue` against it to
  // distinguish case 1 from case 2

  const [draftInputValue, setDraftInputValue] = useState(displayValue);
  const [tableSelectOpen, setTableSelectOpen] = useState(false);
  const draftInputValueRef = useRef(displayValue);
  const lastFlushedValueRef = useRef<string | null>(null);

  useEffect(() => {
    // if the incoming displayValue matches what we last flushed, this is
    // our own commit landing — don't overwrite the draft (the user may
    // have typed ahead). Just clear the flushed marker
    if (lastFlushedValueRef.current !== null && displayValue === lastFlushedValueRef.current) {
      lastFlushedValueRef.current = null;
      return;
    }

    // external change, reset the draft to the new committed value
    lastFlushedValueRef.current = null;
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

  useEffect(() => {
    if (!selected) {
      setTableSelectOpen(false);
    }
  }, [selected]);

  const flushDraftInputValue = useCallback(() => {
    if (draftCommitTimeoutRef.current) {
      clearTimeout(draftCommitTimeoutRef.current);
      draftCommitTimeoutRef.current = null;
    }

    const nextRawValue = draftInputValueRef.current;

    // skip if the value hasn't changed, avoids resetting remoteState
    // (which would wipe a (Valid) status and trigger redundant fetches)
    if (nextRawValue === getDisplayValue(cell)) {
      return;
    }

    // mark what we're about to commit so the sync effect can recognize it.
    lastFlushedValueRef.current = nextRawValue;

    actions.onUpdateCellValue({
      rowId: row.id,
      fieldPath: field.path,
      rawValue: nextRawValue,
    });
  }, [actions, cell, field.path, row.id]);

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

  const selectCell = useCallback(() => {
    actions.onSelectCell({ rowId: row.id, fieldPath: field.path });
  }, [actions, field.path, row.id]);

  const hasValidatorPreview =
    validatorPreview !== null &&
    (validatorPreview.rawValue !== cell.rawValue ||
      (validatorPreview.displayValue ?? null) !== (cell.displayValue ?? null) ||
      !Object.is(validatorPreview.parsedValue, cell.parsedValue));

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
      selected,
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
                actions.onAcceptCorrection({ rowId: row.id, fieldPath: field.path });
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
                actions.onRejectCorrection({ rowId: row.id, fieldPath: field.path });
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
      <div className="pointer-events-none absolute inset-0 box-border min-h-[52px] min-w-0">
        <div className="relative h-full min-h-[52px] w-full">
          <div className="pointer-events-auto h-full min-h-[52px] w-full">
            {field.tableRenderer({
              field,
              cell,
              row,
              session,
              context,
              actions,
              selected,
            })}
          </div>
          <CellStatusBadge
            cell={cell}
            fieldLabel={field.label}
            rowIndex={row.rowIndex + 1}
            onSelect={() => actions.onSelectCell({ rowId: row.id, fieldPath: field.path })}
          />
        </div>
      </div>
    );
  }

  if (field.inputType === ImportInputType.RemoteSelect) {
    return (
      <div className="pointer-events-none absolute inset-0 box-border min-h-[52px] min-w-0">
        <div className="relative h-full w-full">
          <Input
            aria-label={`${field.label} row ${row.rowIndex + 1}`}
            type="text"
            className={cn(
              getControlClassName(cell, selected),
              'pointer-events-auto box-border h-full min-h-[52px] w-full',
              hasStatusBadge && 'pr-10'
            )}
            disabled={cell.dependencyState === DependencyState.Blocked}
            placeholder={field.placeholder}
            value={draftInputValue}
            onFocus={selectCell}
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
            onSelect={() => actions.onSelectCell({ rowId: row.id, fieldPath: field.path })}
          />
        </div>
      </div>
    );
  }

  if (field.inputType === ImportInputType.Select) {
    return (
      <div className="pointer-events-none absolute inset-0 box-border min-h-[52px] min-w-0">
        <Select
          data-import-input-type={ImportInputType.Select}
          disabled={cell.dependencyState === 'blocked'}
          open={tableSelectOpen}
          value={cell.rawValue}
          onOpenChange={(open) => {
            if (open && !cell.rawValue.trim() && !selected) {
              selectCell();
              setTableSelectOpen(false);
              return;
            }
            if (open) {
              selectCell();
            }
            setTableSelectOpen(open);
          }}
          onValueChange={(value) => {
            setTableSelectOpen(false);
            actions.onUpdateCellValue({
              rowId: row.id,
              fieldPath: field.path,
              rawValue: value,
            });
          }}
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
            viewportClassName="p-1.5"
            className={cn(ENTITY_IMPORT_SELECT_MENU_PANEL_CLASSNAME, 'max-h-80')}
          >
            {field.options?.map((option) => (
              <SelectItem
                data-import-input-type-item={`${field.inputType}-option`}
                key={option.value}
                value={option.value}
                className={cn(
                  ENTITY_IMPORT_SELECT_MENU_ITEM_CLASSNAME,
                  option.description && 'option-with-description'
                )}
                icon={<RiCheckboxCircleFill className="size-4.5 text-primary-7" />}
              >
                <div className="content">
                  <span className="w-full">{option.label}</span>
                  {option.description && (
                    <p className="w-full text-sm font-light text-gray-600 whitespace-normal wrap-break-word">
                      {option.description}
                    </p>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CellStatusBadge
          cell={cell}
          fieldLabel={field.label}
          rowIndex={row.rowIndex + 1}
          onSelect={() => actions.onSelectCell({ rowId: row.id, fieldPath: field.path })}
        />
      </div>
    );
  }

  if (field.inputType === ImportInputType.FileBundle) {
    return (
      <div className="pointer-events-none absolute inset-0 box-border min-h-[52px] min-w-0 overflow-hidden">
        <Button
          type="button"
          aria-label={`${field.label} row ${row.rowIndex + 1}`}
          variant="ghost"
          size="md"
          className={cn(
            'pointer-events-auto flex h-full min-h-[52px] w-full min-w-0 max-w-full items-center justify-start gap-1 rounded-none!',
            'border-0 bg-transparent px-3 py-2 text-left text-sm text-inherit',
            'shadow-none hover:bg-transparent hover:text-inherit',
            'overflow-hidden',
            hasStatusBadge && 'pr-10',
            getControlClassName(cell, selected)
          )}
          onClick={() => {
            selectCell();
            fileInputRef.current?.click();
          }}
          title={displayValue}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {displayValue || getImportFileButtonLabel(field)}
          </span>
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
            actions.onSetFileValue({
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
          onSelect={() => actions.onSelectCell({ rowId: row.id, fieldPath: field.path })}
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
          onFocus={selectCell}
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
          onSelect={() => actions.onSelectCell({ rowId: row.id, fieldPath: field.path })}
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
          variant="borderless"
          disabled={cell.dependencyState === DependencyState.Blocked}
          value={parseImportDatePickerValue(cell.rawValue)}
          placeholder={field.placeholder ?? 'Select date'}
          className={cn(
            getControlClassName(cell, selected),
            'pointer-events-auto flex h-full min-h-[52px] w-full items-stretch text-lg text-primary-9',
            'rounded-none border-none! bg-transparent! shadow-none! outline-none ring-0!',
            'focus-within:border-none! focus-within:shadow-none!',
            '[&_.ant-picker]:border-none! [&_.ant-picker]:bg-transparent! [&_.ant-picker]:shadow-none!',
            '[&_.ant-picker-focused]:border-none! [&_.ant-picker-focused]:shadow-none!',
            '[&_.ant-picker-input]:flex [&_.ant-picker-input]:min-h-0 [&_.ant-picker-input]:flex-1 ',
            '[&_.ant-picker-input]:items-center [&_.ant-picker-input>input]:box-border ',
            '[&_.ant-picker-input>input]:h-full [&_.ant-picker-input>input]:min-h-0',
            '[&_input]:placeholder:text-gray-400! [&_input]:placeholder:text-sm!',
            'placeholder:text-sm placeholder:font-light placeholder:text-gray-400'
          )}
          styles={{
            root: {
              height: '100%',
              minHeight: '100%',
              display: 'flex',
              alignItems: 'stretch',
              border: 'none',
              boxShadow: 'none',
              background: 'transparent',
            },
          }}
          format="DD/MM/YYYY"
          maxDate={dayjs().endOf('day')}
          onClick={() => {
            selectCell();
          }}
          onChange={(date) => {
            actions.onUpdateCellValue({
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
          onSelect={() => actions.onSelectCell({ rowId: row.id, fieldPath: field.path })}
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
            hasStatusBadge && 'pr-10',
            'placeholder:text-sm placeholder:font-light placeholder:text-gray-400'
          )}
          disabled={cell.dependencyState === DependencyState.Blocked}
          placeholder={field.placeholder ?? 'Enter value'}
          value={draftInputValue}
          onFocus={selectCell}
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
          onSelect={() => actions.onSelectCell({ rowId: row.id, fieldPath: field.path })}
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
