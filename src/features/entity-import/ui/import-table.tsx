'use client';

import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  RiDeleteRow,
  RiEraserLine,
  RiFileCopyLine,
  RiInsertRowBottom,
  RiMore2Line,
} from '@remixicon/react';
import { Table } from 'antd';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import {
  CellStatus,
  DependencyState,
  ENTITY_IMPORT_ALL_COLUMNS,
  ImportRowResultStatus,
  ImportRunPhase,
  RemoteValidationStatus,
  RowStatus,
} from '@/features/entity-import/core/contracts';
import {
  BLOCKED_CONTROL_CLASSNAME,
  INVALID_CONTROL_CLASSNAME,
} from '@/features/entity-import/core/shared/helpers';
import { ENTITY_IMPORT_POPOVER_Z_CLASS } from '@/features/entity-import/core/shared/ui';
import {
  fieldColumnWidth,
  ROW_ACTIONS_COLUMN_WIDTH,
  ROW_INDEX_COLUMN_WIDTH,
  useImportTableLayout,
} from '@/features/entity-import/hooks/use-import-table-layout';
import { useImportTableScroll } from '@/features/entity-import/hooks/use-import-table-scroll';
import { InlineCell } from '@/features/entity-import/ui/inline-cell';
import { getTableCellUiStatus, TableCellUiStatus } from '@/features/entity-import/ui/status';
import { Badge } from '@/ui/molecules/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { cn } from '@/utils/css-class';

import type { ColumnsType, TableRef } from 'antd/es/table';
import type {
  IEntityImportActions,
  IEntityImportAdapter,
  IEntityImportRuntimeContext,
  IValidatorPreviewState,
} from '@/features/entity-import/core/adapter';
import type { IImportRunState, IImportSessionState } from '@/features/entity-import/core/contracts';

function getImportRowIndexCellAriaLabel(
  row: IImportSessionState['rows'][number],
  importRun: IImportRunState
): string {
  const importRowStatus = importRun.rowResults[row.id]?.status;
  const isImportPhase =
    importRun.phase === ImportRunPhase.Running || importRun.phase === ImportRunPhase.Completed;

  const hasAnyCellProblem = Object.values(row.cells).some(
    (cell) =>
      cell.status === CellStatus.Invalid ||
      cell.remoteState.status === RemoteValidationStatus.Invalid ||
      cell.remoteState.status === RemoteValidationStatus.Pending
  );
  const isRowFullyValid = row.rowStatus === RowStatus.Valid && !hasAnyCellProblem;

  const n = row.rowIndex + 1;
  if (isImportPhase) {
    if (importRowStatus === ImportRowResultStatus.Pending) {
      return `Row ${n} import status: importing`;
    }
    if (importRowStatus === ImportRowResultStatus.Succeeded) {
      return `Row ${n} import status: imported successfully`;
    }
    if (importRowStatus === ImportRowResultStatus.Failed) {
      return `Row ${n} import status: failed to import`;
    }
    return `Row ${n} import status: pending`;
  }
  if (isRowFullyValid) {
    return `Row ${n} status: Ready`;
  }
  if (row.rowStatus === RowStatus.Invalid || hasAnyCellProblem) {
    return `Row ${n} status: Needs attention`;
  }
  return `Row ${n} status: Needs attention`;
}

interface ImportTableProps<TPayload, TResult> {
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: IEntityImportRuntimeContext;
  session: IImportSessionState;
  actions: IEntityImportActions;
  importRun: IImportRunState;
  validatorPreview: IValidatorPreviewState;
}

function isSelectedImportCell(
  selectedCell: IImportSessionState['selectedCell'],
  rowId: string,
  fieldPath: string
): boolean {
  return selectedCell?.rowId === rowId && selectedCell?.fieldPath === fieldPath;
}

function isValidatorPreviewTarget(
  validatorPreview: IValidatorPreviewState,
  rowId: string,
  fieldPath: string
): boolean {
  return validatorPreview.rowId === rowId && validatorPreview.fieldPath === fieldPath;
}

export function ImportTable<TPayload, TResult>({
  adapter,
  context,
  session,
  actions,
  importRun,
  validatorPreview,
}: ImportTableProps<TPayload, TResult>) {
  const selectedCell = session.selectedCell;
  const latestSessionRef = useRef(session);
  const previousSelectedCellRef = useRef(session.selectedCell);
  const previousImportRowResultsRef = useRef(importRun.rowResults);
  const previousValidatorPreviewRef = useRef(validatorPreview);
  const tableRef = useRef<TableRef>(null);

  const { setWrapperRef, resizeOverrides, beginResize, scrollWidth, scrollHeight } =
    useImportTableLayout({ fields: adapter.fields, tableRef });

  const selectedFieldPathForScroll =
    session.validatorSelection.fieldPath === ENTITY_IMPORT_ALL_COLUMNS
      ? session.validatorScrollFieldPath
      : session.validatorSelection.fieldPath;

  const { scrollToNewRowOnNextCommit } = useImportTableScroll({
    tableRef,
    fields: adapter.fields,
    resizeOverrides,
    rowCount: session.rows.length,
    selectedFieldPath: selectedFieldPathForScroll,
    selectedRowId: session.validatorSelection.rowId,
    selectionTrigger: `${session.validatorSelection.rowId ?? ''}:${session.validatorSelection.fieldPath ?? ''}:${session.validatorScrollRequestVersion}`,
  });

  useEffect(() => {
    latestSessionRef.current = session;
  }, [session]);

  useLayoutEffect(() => {
    previousSelectedCellRef.current = selectedCell;
  }, [selectedCell]);

  useLayoutEffect(() => {
    previousImportRowResultsRef.current = importRun.rowResults;
  }, [importRun.rowResults]);

  useLayoutEffect(() => {
    previousValidatorPreviewRef.current = validatorPreview;
  }, [validatorPreview]);

  const handleAddRow = useCallback(() => {
    scrollToNewRowOnNextCommit();
    actions.onAddRow();
  }, [actions, scrollToNewRowOnNextCommit]);

  const isCellSelected = useCallback(
    (rowId: string, fieldPath: string) => {
      return isSelectedImportCell(selectedCell, rowId, fieldPath);
    },
    [selectedCell]
  );

  const didCellSelectionChange = useCallback(
    (rowId: string, fieldPath: string) => {
      return (
        isSelectedImportCell(previousSelectedCellRef.current, rowId, fieldPath) !==
        isSelectedImportCell(selectedCell, rowId, fieldPath)
      );
    },
    [selectedCell]
  );

  const didCellPreviewChange = useCallback(
    (rowId: string, fieldPath: string) => {
      const previousMatches = isValidatorPreviewTarget(
        previousValidatorPreviewRef.current,
        rowId,
        fieldPath
      );
      const currentMatches = isValidatorPreviewTarget(validatorPreview, rowId, fieldPath);

      return (
        previousMatches !== currentMatches ||
        (currentMatches && previousValidatorPreviewRef.current !== validatorPreview)
      );
    },
    [validatorPreview]
  );

  const columns = useMemo<ColumnsType<IImportSessionState['rows'][number]>>(
    () => [
      {
        title: (
          <div className="relative flex min-h-9 items-center justify-center pr-2">
            <span className="text-sm  font-semibold uppercase tracking-wide text-neutral-4">
              Row
            </span>
          </div>
        ),
        key: 'row',
        width: ROW_INDEX_COLUMN_WIDTH,
        fixed: 'left',
        align: 'center',
        render: (_, row) => {
          const importRowStatus = importRun.rowResults[row.id]?.status;
          const isImportPhase =
            importRun.phase === ImportRunPhase.Running ||
            importRun.phase === ImportRunPhase.Completed;

          const hasAnyCellProblem = Object.values(row.cells).some(
            (cell) =>
              cell.status === CellStatus.Invalid ||
              cell.remoteState.status === RemoteValidationStatus.Invalid ||
              cell.remoteState.status === RemoteValidationStatus.Pending
          );
          const isRowFullyValid = row.rowStatus === RowStatus.Valid && !hasAnyCellProblem;

          return (
            <div className="flex min-h-[52px] flex-col items-center justify-center gap-1.5 py-2">
              <span className="text-xs text-center font-semibold text-neutral-4">
                {row.rowIndex + 1}
              </span>
              {isImportPhase ? (
                importRowStatus === ImportRowResultStatus.Pending ? (
                  <span className="inline-flex items-center justify-center gap-1 rounded-full bg-primary-1 px-0.5 py-0.5 text-[10px] w-4.5! h-4.5! font-semibold text-primary-9">
                    <LoadingOutlined spin className="text-[10px]" />
                  </span>
                ) : importRowStatus === ImportRowResultStatus.Succeeded ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <CheckCircleFilled className="text-[10px]" />
                    Imported
                  </span>
                ) : importRowStatus === ImportRowResultStatus.Failed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                    <CloseCircleFilled className="text-[10px]" />
                    Failed
                  </span>
                ) : null
              ) : isRowFullyValid ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <CheckCircleFilled className="text-[10px]" />
                  Valid
                </span>
              ) : row.rowStatus === RowStatus.Invalid || hasAnyCellProblem ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <ExclamationCircleFilled className="text-[10px]" />
                  Invalid
                </span>
              ) : null}
            </div>
          );
        },
        onCell: (record) => ({
          className: 'align-center',
          'aria-label': getImportRowIndexCellAriaLabel(record, importRun),
        }),
        shouldCellUpdate: (record, prevRecord) =>
          record !== prevRecord ||
          previousImportRowResultsRef.current[record.id]?.status !==
            importRun.rowResults[record.id]?.status,
      },
      ...adapter.fields.map((field) => {
        const width = fieldColumnWidth(field, resizeOverrides);
        const usesCustomTableRenderer = Boolean(field.tableRenderer);

        return {
          title: (
            <div className="-mx-2 flex min-h-9 w-full min-w-0 items-center gap-1.5 px-2">
              <span className="min-w-0 shrink truncate text-sm font-semibold uppercase tracking-wide text-neutral-4">
                {field.label}
              </span>
              {field.required ? (
                <Badge
                  variant="outline"
                  rounded
                  className={cn(
                    'shrink-0 border-transparent bg-primary-5 px-2 py-0.5',
                    'text-[8px] font-semibold leading-none text-white shadow-none'
                  )}
                >
                  Required
                </Badge>
              ) : null}
              <button
                type="button"
                tabIndex={0}
                className={cn(
                  'absolute top-1/2 right-0 z-10 -translate-y-1/2 translate-x-1/2 w-1.5 h-[calc(100%-16px)]',
                  'cursor-col-resize rounded-sm border-0 bg-transparent p-0 hover:bg-neutral-200/80'
                )}
                aria-label={`Resize ${field.label} column`}
                onMouseDown={(event) => beginResize(event, field.path)}
              />
            </div>
          ),
          onHeaderCell: () => ({
            className: 'relative! overflow-visible!',
          }),
          key: field.path,
          width,
          ellipsis: false,
          render: (_: unknown, row: IImportSessionState['rows'][number]) => {
            const cell = row.cells[field.path];
            const isSelected = isCellSelected(row.id, field.path);
            const activeValidatorPreview = isValidatorPreviewTarget(
              validatorPreview,
              row.id,
              field.path
            )
              ? validatorPreview
              : null;

            return (
              <InlineCell
                field={field}
                cell={cell}
                row={row}
                session={latestSessionRef.current}
                context={context}
                actions={actions}
                selected={isSelected}
                validatorPreview={activeValidatorPreview}
              />
            );
          },
          onCell: (row: IImportSessionState['rows'][number]) => {
            const cell = row.cells[field.path];
            const isSelected = isCellSelected(row.id, field.path);
            const cellUiStatus = getTableCellUiStatus(cell);

            return {
              className: cn(
                'align-top !p-0 transition-colors',
                { 'bg-blue-50/60': isSelected },
                { [INVALID_CONTROL_CLASSNAME]: cellUiStatus === TableCellUiStatus.Warning },
                {
                  'bg-sky-50/70 text-sky-950 [&_textarea]:bg-sky-50/70 [&_textarea]:text-sky-950':
                    cellUiStatus === TableCellUiStatus.NeedsSelection,
                },
                {
                  'bg-neutral-50 text-neutral-700 [&_textarea]:bg-neutral-50 [&_textarea]:text-neutral-700':
                    cellUiStatus === TableCellUiStatus.Validating,
                },
                { [BLOCKED_CONTROL_CLASSNAME]: cell.dependencyState === DependencyState.Blocked }
              ),
            };
          },
          shouldCellUpdate: usesCustomTableRenderer
            ? (
                record: IImportSessionState['rows'][number],
                prevRecord: IImportSessionState['rows'][number]
              ) =>
                record !== prevRecord ||
                didCellSelectionChange(record.id, field.path) ||
                didCellPreviewChange(record.id, field.path)
            : (
                record: IImportSessionState['rows'][number],
                prevRecord: IImportSessionState['rows'][number]
              ) =>
                record.id !== prevRecord.id ||
                record.rowIndex !== prevRecord.rowIndex ||
                record.cells[field.path] !== prevRecord.cells[field.path] ||
                didCellSelectionChange(record.id, field.path) ||
                didCellPreviewChange(record.id, field.path),
        };
      }),
      {
        title: (
          <div className="flex min-h-9 items-center justify-center px-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-neutral-4">
              Actions
            </span>
          </div>
        ),
        key: 'actions',
        width: ROW_ACTIONS_COLUMN_WIDTH,
        fixed: 'right',
        align: 'center',
        render: (_: unknown, row: IImportSessionState['rows'][number]) => (
          <div className="flex h-full min-h-[52px] items-center justify-center px-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Actions row ${row.rowIndex + 1}`}
                  className={cn(
                    'inline-flex size-8 items-center justify-center rounded-full',
                    'border border-neutral-200 bg-white text-primary-9 transition',
                    'hover:border-neutral-300 hover:bg-neutral-50'
                  )}
                >
                  <RiMore2Line aria-hidden className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={cn(
                  ENTITY_IMPORT_POPOVER_Z_CLASS,
                  'border border-neutral-200 bg-white rounded-2xl'
                )}
              >
                <DropdownMenuItem
                  aria-label={`Clear row ${row.rowIndex + 1}`}
                  className="text-primary-9 h-11! font-medium text-sm cursor-pointer rounded-2xl"
                  onSelect={() => actions.onClearRow(row.id)}
                >
                  <RiEraserLine aria-hidden className="size-4 shrink-0 text-primary-9" />
                  Clear
                </DropdownMenuItem>
                <DropdownMenuItem
                  aria-label={`Duplicate row ${row.rowIndex + 1}`}
                  className="text-primary-9 h-11! font-medium text-sm cursor-pointer rounded-2xl"
                  onSelect={() => actions.onDuplicateRow(row.id)}
                >
                  <RiFileCopyLine aria-hidden className="size-4 shrink-0 text-primary-9" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  aria-label={`Delete row ${row.rowIndex + 1}`}
                  className="text-primary-9 h-11! font-medium text-sm cursor-pointer rounded-2xl"
                  onSelect={() => actions.onDeleteRow(row.id)}
                >
                  <RiDeleteRow aria-hidden className="size-4 shrink-0" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        onCell: () => ({
          className: 'align-top !p-0 bg-white',
        }),
        shouldCellUpdate: (record, prevRecord) =>
          record.id !== prevRecord.id || record.rowIndex !== prevRecord.rowIndex,
      },
    ],
    [
      actions,
      adapter.fields,
      beginResize,
      context,
      didCellPreviewChange,
      didCellSelectionChange,
      isCellSelected,
      resizeOverrides,
      importRun,
      validatorPreview,
    ]
  );

  const scroll = useMemo(
    () => ({ x: scrollWidth, y: scrollHeight, scrollToFirstRowOnChange: false }),
    [scrollWidth, scrollHeight]
  );

  const footer = useCallback(
    () => (
      <button
        type="button"
        onClick={handleAddRow}
        className={cn(
          'flex w-full items-center justify-center gap-3 px-5 py-4 text-sm',
          'font-semibold text-primary-9 transition-colors hover:bg-neutral-50'
        )}
      >
        <span>Add row</span>
        <RiInsertRowBottom />
      </button>
    ),
    [handleAddRow]
  );

  return (
    <div ref={setWrapperRef} className="h-full min-h-0 overflow-hidden bg-background">
      <Table
        ref={tableRef}
        rowKey="id"
        size="small"
        pagination={false}
        tableLayout="fixed"
        columns={columns}
        dataSource={session.rows}
        scroll={scroll}
        virtual={session.rows.length >= 50}
        footer={footer}
        className={cn(
          'entity-import-table',
          '[&_.ant-table-thead_.ant-table-cell]:bg-white',
          '[&_.ant-table-cell]:align-top',
          '[&_.ant-table-footer]:p-0',
          '[&_.ant-spin-container]:h-full',
          '[&_.ant-spin-nested-loading]:h-full',
          '[&_th.ant-table-cell>span]:text-sm',
          '[&_.ant-table-cell]:bg-background',
          '[&_.ant-table-footer]:bg-white [&_.ant-table-footer_button]:bg-white!',
          '[&_.ant-table-footer]:hover:bg-gray-100! [&_.ant-table-footer]:p-0! [&_.ant-table-footer:hover_button]:bg-gray-100! ',
          // allow in-cell controls (Input, DatePicker) fill row height via
          // absolute inset-0; h-full on td children is often unresolved.
          '[&_.ant-table-tbody>tr>td.ant-table-cell]:relative'
        )}
      />
    </div>
  );
}
