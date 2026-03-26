'use client';

import { MoreOutlined } from '@ant-design/icons';
import { RiInsertRowBottom } from '@remixicon/react';
import { Table } from 'antd';
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ENTITY_IMPORT_ALL_COLUMNS } from '@/features/entity-import/core/contracts';
import { ENTITY_IMPORT_POPOVER_Z_CLASS } from '@/features/entity-import/ui/entity-import-popover';
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

import type { ColumnsType, TableRef } from 'antd/es/table';
import type {
  EntityImportRuntimeContext,
  IEntityImportActions,
  IEntityImportAdapter,
} from '@/features/entity-import/core/adapter';
import type { IImportSessionState } from '@/features/entity-import/core/contracts';

const DEFAULT_FIELD_COLUMN_WIDTH = 200;
const DEFAULT_TABLE_BODY_SCROLL_HEIGHT = 1;
const ROW_INDEX_COLUMN_WIDTH = 68;
const ROW_ACTIONS_COLUMN_WIDTH = 72;

interface ImportTableProps<TPayload, TResult> {
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  session: IImportSessionState;
  actions: IEntityImportActions;
}

function fieldColumnWidth(
  field: IImportSessionState['fields'][number],
  overrides: Record<string, number>
): number {
  return overrides[field.path] ?? field.columnWidth ?? DEFAULT_FIELD_COLUMN_WIDTH;
}

export function ImportTable<TPayload, TResult>({
  adapter,
  context,
  session,
  actions,
}: ImportTableProps<TPayload, TResult>) {
  const previousRowCountRef = useRef(session.rows.length);
  const shouldScrollToNewRowRef = useRef(false);
  const tableRef = useRef<TableRef>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [resizeOverrides, setResizeOverrides] = useState<Record<string, number>>({});
  const [containerHeight, setContainerHeight] = useState(0);
  const resizeOverridesRef = useRef(resizeOverrides);
  resizeOverridesRef.current = resizeOverrides;

  const syncContainerHeight = useCallback((target?: HTMLElement | null) => {
    const element = target ?? wrapperRef.current;
    if (!element) {
      return;
    }

    const nextHeight = element.getBoundingClientRect().height;
    setContainerHeight((current) => (current === nextHeight ? current : nextHeight));
  }, []);

  useLayoutEffect(() => {
    syncContainerHeight();
  }, [syncContainerHeight]);

  useLayoutEffect(() => {
    if (shouldScrollToNewRowRef.current && session.rows.length > previousRowCountRef.current) {
      const tableBody = tableRef.current?.nativeElement.querySelector(
        '.ant-table-body'
      ) as HTMLDivElement | null;
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

    const tableBody = tableRef.current?.nativeElement.querySelector(
      '.ant-table-body'
    ) as HTMLDivElement | null;
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
    element: wrapperRef.current ?? undefined,
    callback: syncContainerHeight,
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

  const headerHeight =
    tableRef.current?.nativeElement
      .querySelector('.ant-table-header, .ant-table-thead')
      ?.getBoundingClientRect().height ?? 0;
  const footerHeight =
    tableRef.current?.nativeElement.querySelector('.ant-table-footer')?.getBoundingClientRect()
      .height ?? 0;
  const scrollHeight = Math.max(
    containerHeight - headerHeight - footerHeight,
    DEFAULT_TABLE_BODY_SCROLL_HEIGHT
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
          const rowUiStatus = getTableRowUiStatus(row);
          const rowStatusLabel = getTableRowUiStatusLabel(rowUiStatus);

          return (
            <div className="flex min-h-[52px] flex-col items-center justify-center gap-1 py-2">
              <span
                role="img"
                aria-label={`Row ${row.rowIndex + 1} status: ${rowStatusLabel}`}
                className={cn(
                  'inline-flex size-3 rounded-full border',
                  rowUiStatus === TableRowUiStatus.Ready &&
                    'border-emerald-300 bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]',
                  rowUiStatus === TableRowUiStatus.Validating &&
                    'border-neutral-300 bg-neutral-500 shadow-[0_0_0_3px_rgba(115,115,115,0.12)]',
                  rowUiStatus === TableRowUiStatus.NeedsSelection &&
                    'border-sky-300 bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.12)]',
                  rowUiStatus === TableRowUiStatus.NeedsAttention &&
                    'border-amber-300 bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.12)]',
                  rowUiStatus === TableRowUiStatus.Idle &&
                    'border-neutral-200 bg-neutral-200 shadow-[0_0_0_3px_rgba(229,229,229,0.5)]'
                )}
              />
              <span className="text-xs text-center font-semibold text-neutral-4">
                {row.rowIndex + 1}
              </span>
            </div>
          );
        },
        onCell: () => ({
          className: 'align-center',
        }),
      },
      ...adapter.fields.map((field) => {
        const width = fieldColumnWidth(field, resizeOverrides);

        return {
          title: (
            <div className="relative -mx-2 flex min-h-9 items-center overflow-visible px-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-neutral-4">
                {field.label}
              </span>
              <button
                type="button"
                tabIndex={0}
                className="absolute top-0 right-0 z-10 h-full w-3 translate-x-1/2 cursor-col-resize rounded-sm border-0 bg-transparent p-0 hover:bg-neutral-200/80"
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
            const isSelected =
              session.selectedCell?.rowId === row.id &&
              session.selectedCell?.fieldPath === field.path;

            return (
              <InlineCell
                field={field}
                cell={cell}
                row={row}
                session={session}
                context={context}
                actions={actions}
                selected={isSelected}
              />
            );
          },
          onCell: (row: IImportSessionState['rows'][number]) => {
            const cell = row.cells[field.path];
            const isSelected =
              session.selectedCell?.rowId === row.id &&
              session.selectedCell?.fieldPath === field.path;
            const cellUiStatus = getTableCellUiStatus(cell);

            return {
              className: cn(
                'align-top !p-0 transition-colors',
                isSelected && 'bg-blue-50/60',
                cellUiStatus === TableCellUiStatus.Warning && INVALID_CONTROL_CLASSNAME,
                cellUiStatus === TableCellUiStatus.NeedsSelection &&
                  'bg-sky-50/70 text-sky-950 [&_textarea]:bg-sky-50/70 [&_textarea]:text-sky-950',
                cellUiStatus === TableCellUiStatus.Validating &&
                  'bg-neutral-50 text-neutral-700 [&_textarea]:bg-neutral-50 [&_textarea]:text-neutral-700',
                cell.dependencyState === 'blocked' && BLOCKED_CONTROL_CLASSNAME
              ),
            };
          },
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
                    'inline-flex size-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-primary-9 transition',
                    'hover:border-neutral-300 hover:bg-neutral-50'
                  )}
                >
                  <MoreOutlined />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={cn(ENTITY_IMPORT_POPOVER_Z_CLASS, 'border border-neutral-200 bg-white')}
              >
                <DropdownMenuItem
                  aria-label={`Clear row ${row.rowIndex + 1}`}
                  className="text-primary-9"
                  onSelect={() => actions.clearRow(row.id)}
                >
                  Clear
                </DropdownMenuItem>
                <DropdownMenuItem
                  aria-label={`Delete row ${row.rowIndex + 1}`}
                  variant="destructive"
                  onSelect={() => actions.deleteRow(row.id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        onCell: () => ({
          className: 'align-top !p-0 bg-white',
        }),
      },
    ],
    [actions, adapter.fields, beginResize, context, resizeOverrides, session]
  );

  return (
    <div ref={wrapperRef} className="h-full min-h-0 overflow-hidden bg-white">
      <Table
        ref={tableRef}
        rowKey="id"
        size="small"
        pagination={false}
        tableLayout="fixed"
        columns={columns}
        dataSource={session.rows}
        scroll={{ x: scrollWidth, y: scrollHeight }}
        footer={() => (
          <button
            type="button"
            onClick={handleAddRow}
            className="flex w-full items-center justify-center gap-3 px-5 py-4 text-sm font-semibold text-primary-9 transition-colors hover:bg-neutral-50"
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
          // allow in-cell controls (Input, DatePicker) fill row height via absolute inset-0; h-full on td children is often unresolved.
          '[&_.ant-table-tbody>tr>td.ant-table-cell]:relative'
        )}
      />
    </div>
  );
}
