'use client';

import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from '@ant-design/icons';
import { RiDeleteBinLine, RiEraserLine, RiInsertRowBottom, RiMore2Line } from '@remixicon/react';
import { Table } from 'antd';
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DependencyState,
  ENTITY_IMPORT_ALL_COLUMNS,
  ImportRowResultStatus,
} from '@/features/entity-import/core/contracts';
import {
  BLOCKED_CONTROL_CLASSNAME,
  INVALID_CONTROL_CLASSNAME,
  InlineCell,
} from '@/features/entity-import/ui/inline-cell';
import {
  getTableCellUiStatus,
  getTableRowUiStatus,
  getTableRowUiStatusLabel,
  TableCellUiStatus,
  TableRowUiStatus,
} from '@/features/entity-import/ui/status';
import useResizeObserver from '@/hooks/useResizeObserver';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { cn } from '@/utils/css-class';

import { ENTITY_IMPORT_POPOVER_Z_CLASS } from '../core/shared/ui';

import type { ColumnsType, TableRef } from 'antd/es/table';
import type {
  EntityImportRuntimeContext,
  IEntityImportActions,
  IEntityImportAdapter,
  IValidatorPreviewState,
} from '@/features/entity-import/core/adapter';
import type { IImportRunState, IImportSessionState } from '@/features/entity-import/core/contracts';

const DEFAULT_FIELD_COLUMN_WIDTH = 200;
const DEFAULT_TABLE_BODY_SCROLL_HEIGHT = 1;
const MIN_ROW_COUNT_FOR_VIRTUAL_TABLE = 20;
const ROW_INDEX_COLUMN_WIDTH = 68;
const ROW_ACTIONS_COLUMN_WIDTH = 72;

interface ImportTableProps<TPayload, TResult> {
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
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

function findScrollableTableBody(tableRef: TableRef | null): HTMLDivElement | null {
  const element = tableRef?.nativeElement;
  if (!element) {
    return null;
  }

  return (
    (element.querySelector('.ant-table-body') as HTMLDivElement | null) ??
    (element.querySelector('.rc-virtual-list-holder') as HTMLDivElement | null) ??
    (element.querySelector('[class*="virtual-holder"]') as HTMLDivElement | null)
  );
}

function fieldColumnWidth(
  field: IImportSessionState['fields'][number],
  overrides: Record<string, number>
): number {
  return overrides[field.path] ?? field.columnWidth ?? DEFAULT_FIELD_COLUMN_WIDTH;
}

function resolveImportRowStatusLabel(
  status: IImportRunState['rowResults'][string]['status'] | undefined
): string | null {
  if (status === ImportRowResultStatus.Pending) {
    return 'importing';
  }

  if (status === ImportRowResultStatus.Succeeded) {
    return 'imported successfully';
  }

  if (status === ImportRowResultStatus.Failed) {
    return 'failed to import';
  }

  return null;
}

export function ImportTable<TPayload, TResult>({
  adapter,
  context,
  session,
  actions,
  importRun,
  validatorPreview,
}: ImportTableProps<TPayload, TResult>) {
  const shouldUseVirtualTable = session.rows.length > MIN_ROW_COUNT_FOR_VIRTUAL_TABLE;
  const selectedCell = session.selectedCell;
  const latestSessionRef = useRef(session);
  const previousSelectedCellRef = useRef(session.selectedCell);
  const previousImportRowResultsRef = useRef(importRun.rowResults);
  const previousValidatorPreviewRef = useRef(validatorPreview);
  const previousRowCountRef = useRef(session.rows.length);
  const shouldScrollToNewRowRef = useRef(false);
  const tableRef = useRef<TableRef>(null);
  const [resizeOverrides, setResizeOverrides] = useState<Record<string, number>>({});
  const [containerHeight, setContainerHeight] = useState(0);
  const [tableChromeHeights, setTableChromeHeights] = useState({
    footerHeight: 0,
    headerHeight: 0,
  });
  const [wrapperElement, setWrapperElement] = useState<HTMLDivElement | null>(null);
  const resizeOverridesRef = useRef(resizeOverrides);

  useEffect(() => {
    latestSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    resizeOverridesRef.current = resizeOverrides;
  }, [resizeOverrides]);

  useLayoutEffect(() => {
    previousSelectedCellRef.current = selectedCell;
  }, [selectedCell]);

  useLayoutEffect(() => {
    previousImportRowResultsRef.current = importRun.rowResults;
  }, [importRun.rowResults]);

  useLayoutEffect(() => {
    previousValidatorPreviewRef.current = validatorPreview;
  }, [validatorPreview]);

  const syncContainerHeight = useCallback(
    (target?: HTMLElement | null) => {
      const element = target ?? wrapperElement;
      if (!element) {
        return;
      }

      const nextHeight = element.getBoundingClientRect().height;
      setContainerHeight((current) => (current === nextHeight ? current : nextHeight));
    },
    [wrapperElement]
  );

  const syncTableChromeHeights = useCallback(() => {
    const nativeElement = tableRef.current?.nativeElement;
    if (!nativeElement) {
      return;
    }

    const headerHeight =
      nativeElement.querySelector('.ant-table-header, .ant-table-thead')?.getBoundingClientRect()
        .height ?? 0;
    const footerHeight =
      nativeElement.querySelector('.ant-table-footer')?.getBoundingClientRect().height ?? 0;

    setTableChromeHeights((current) =>
      current.headerHeight === headerHeight && current.footerHeight === footerHeight
        ? current
        : {
            footerHeight,
            headerHeight,
          }
    );
  }, []);

  const setWrapperRef = useCallback(
    (element: HTMLDivElement | null) => {
      setWrapperElement(element);
      if (!element) {
        return;
      }

      syncContainerHeight(element);
      requestAnimationFrame(() => {
        syncTableChromeHeights();
      });
    },
    [syncContainerHeight, syncTableChromeHeights]
  );

  useLayoutEffect(() => {
    if (shouldScrollToNewRowRef.current && session.rows.length > previousRowCountRef.current) {
      const tableBody = findScrollableTableBody(tableRef.current);
      if (tableBody) {
        tableBody.scrollTop = tableBody.scrollHeight;
      }
      shouldScrollToNewRowRef.current = false;
    }

    previousRowCountRef.current = session.rows.length;
  }, [session.rows.length]);

  useLayoutEffect(() => {
    const selectedFieldPath = session.validatorSelection.fieldPath;
    if (!selectedFieldPath || selectedFieldPath === ENTITY_IMPORT_ALL_COLUMNS) {
      return;
    }

    const tableBody = findScrollableTableBody(tableRef.current);
    if (!tableBody) {
      return;
    }

    const selectedFieldIndex = adapter.fields.findIndex(
      (field) => field.path === selectedFieldPath
    );
    if (selectedFieldIndex < 0) {
      return;
    }

    const targetLeft =
      ROW_INDEX_COLUMN_WIDTH +
      adapter.fields
        .slice(0, selectedFieldIndex)
        .reduce((width, field) => width + fieldColumnWidth(field, resizeOverrides), 0);
    const targetRight =
      targetLeft + fieldColumnWidth(adapter.fields[selectedFieldIndex], resizeOverrides);
    const viewportLeft = tableBody.scrollLeft;
    const viewportRight = viewportLeft + tableBody.clientWidth;

    if (targetLeft < viewportLeft) {
      tableBody.scrollLeft = targetLeft;
      return;
    }

    if (targetRight > viewportRight) {
      tableBody.scrollLeft = Math.max(targetRight - tableBody.clientWidth, 0);
    }
  }, [adapter.fields, resizeOverrides, session.validatorSelection.fieldPath]);

  useResizeObserver({
    element: wrapperElement ?? undefined,
    callback: (target) => {
      syncContainerHeight(target);
      syncTableChromeHeights();
    },
  });

  const handleAddRow = useCallback(() => {
    shouldScrollToNewRowRef.current = true;
    actions.addRow();
  }, [actions]);

  const beginResize = useCallback(
    (event: ReactMouseEvent, fieldPath: string) => {
      event.preventDefault();
      event.stopPropagation();
      const field = adapter.fields.find((f) => f.path === fieldPath);
      const startX = event.clientX;
      const startWidth =
        resizeOverridesRef.current[fieldPath] ?? field?.columnWidth ?? DEFAULT_FIELD_COLUMN_WIDTH;

      const onMove = (moveEvent: MouseEvent) => {
        const next = Math.max(64, startWidth + moveEvent.clientX - startX);
        setResizeOverrides((current) => ({ ...current, [fieldPath]: next }));
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [adapter.fields]
  );

  const scrollWidth = useMemo(() => {
    const fieldsWidth = adapter.fields.reduce(
      (acc, field) => acc + fieldColumnWidth(field, resizeOverrides),
      0
    );
    return ROW_INDEX_COLUMN_WIDTH + fieldsWidth + ROW_ACTIONS_COLUMN_WIDTH;
  }, [adapter.fields, resizeOverrides]);

  const scrollHeight = Math.max(
    containerHeight - tableChromeHeights.headerHeight - tableChromeHeights.footerHeight,
    DEFAULT_TABLE_BODY_SCROLL_HEIGHT
  );

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
          const rowUiStatus = getTableRowUiStatus(row, adapter.fields);
          const rowStatusLabel = getTableRowUiStatusLabel(rowUiStatus);
          const importRowStatus = importRun.rowResults[row.id]?.status;
          const importStatusLabel = resolveImportRowStatusLabel(importRowStatus);

          return (
            <div className="flex min-h-[52px] flex-col items-center justify-center gap-1.5 py-2">
              <span
                role="img"
                aria-label={`Row ${row.rowIndex + 1} status: ${rowStatusLabel}`}
                className={cn(
                  'inline-flex size-3 rounded-full border',
                  {
                    'border-emerald-300 bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]':
                      rowUiStatus === TableRowUiStatus.Ready,
                  },
                  {
                    'border-neutral-300 bg-neutral-500 shadow-[0_0_0_3px_rgba(115,115,115,0.12)]':
                      rowUiStatus === TableRowUiStatus.Validating,
                  },
                  {
                    'border-sky-300 bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.12)]':
                      rowUiStatus === TableRowUiStatus.NeedsSelection,
                  },
                  {
                    'border-amber-300 bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.12)]':
                      rowUiStatus === TableRowUiStatus.NeedsAttention,
                  },
                  {
                    'border-neutral-200 bg-neutral-200 shadow-[0_0_0_3px_rgba(229,229,229,0.5)]':
                      rowUiStatus === TableRowUiStatus.Idle,
                  }
                )}
              />
              <span className="text-xs text-center font-semibold text-neutral-4">
                {row.rowIndex + 1}
              </span>
              {importStatusLabel ? (
                <span
                  role="img"
                  aria-label={`Row ${row.rowIndex + 1} import status: ${importStatusLabel}`}
                  className={cn(
                    'inline-flex items-center justify-center text-sm',
                    { 'text-primary-9': importRowStatus === ImportRowResultStatus.Pending },
                    { 'text-emerald-600': importRowStatus === ImportRowResultStatus.Succeeded },
                    { 'text-rose-600': importRowStatus === ImportRowResultStatus.Failed }
                  )}
                >
                  {importRowStatus === ImportRowResultStatus.Pending ? (
                    <LoadingOutlined spin />
                  ) : importRowStatus === ImportRowResultStatus.Succeeded ? (
                    <CheckCircleFilled />
                  ) : (
                    <CloseCircleFilled />
                  )}
                </span>
              ) : null}
            </div>
          );
        },
        onCell: () => ({
          className: 'align-center',
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
            <div className="relative -mx-2 flex min-h-9 items-center overflow-visible px-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-neutral-4">
                {field.label}
              </span>
              <button
                type="button"
                tabIndex={0}
                className={cn(
                  'absolute top-0 right-0 z-10 h-full w-3 translate-x-1/2',
                  'cursor-col-resize rounded-sm border-0 bg-transparent p-0 hover:bg-neutral-200/80'
                )}
                aria-label={`Resize ${field.label} column`}
                onMouseDown={(event) => beginResize(event, field.path)}
              />
            </div>
          ),
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
                className={cn(ENTITY_IMPORT_POPOVER_Z_CLASS, 'border border-neutral-200 bg-white')}
              >
                <DropdownMenuItem
                  aria-label={`Clear row ${row.rowIndex + 1}`}
                  className="text-primary-9 h-11! font-medium text-sm cursor-pointer"
                  onSelect={() => actions.clearRow(row.id)}
                >
                  <RiEraserLine aria-hidden className="size-4 shrink-0 text-primary-9" />
                  Clear row
                </DropdownMenuItem>
                <DropdownMenuItem
                  aria-label={`Delete row ${row.rowIndex + 1}`}
                  variant="destructive"
                  className="text-primary-9 h-11! font-medium text-sm cursor-pointer"
                  onSelect={() => actions.deleteRow(row.id)}
                >
                  <RiDeleteBinLine aria-hidden className="size-4 shrink-0" />
                  Delete row
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
      importRun.rowResults,
      validatorPreview,
    ]
  );

  return (
    <div ref={setWrapperRef} className="h-full min-h-0 overflow-hidden bg-white">
      <Table
        ref={tableRef}
        rowKey="id"
        size="small"
        pagination={false}
        tableLayout="fixed"
        virtual={shouldUseVirtualTable}
        columns={columns}
        dataSource={session.rows}
        scroll={{ x: scrollWidth, y: scrollHeight, scrollToFirstRowOnChange: false }}
        footer={() => (
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
        )}
        className={cn(
          'entity-import-table',
          '[&_.ant-table-thead_.ant-table-cell]:bg-white',
          '[&_.ant-table-cell]:align-top',
          '[&_.ant-table-footer]:p-0',
          '[&_.ant-spin-container]:h-full',
          '[&_.ant-spin-nested-loading]:h-full',
          '[&_th.ant-table-cell>span]:text-sm',
          // allow in-cell controls (Input, DatePicker) fill row height via
          // absolute inset-0; h-full on td children is often unresolved.
          '[&_.ant-table-tbody>tr>td.ant-table-cell]:relative'
        )}
      />
    </div>
  );
}
