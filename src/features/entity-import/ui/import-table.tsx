'use client';

import { Table } from 'antd';
import { type MouseEvent as ReactMouseEvent, useCallback, useMemo, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import { CellStatus, DependencyState } from '../core/contracts';
import { InlineCell } from './inline-cell';

import type { ColumnsType } from 'antd/es/table';
import type {
  EntityImportActions,
  EntityImportAdapter,
  EntityImportRuntimeContext,
} from '../core/adapter';
import type { ImportSessionState } from '../core/contracts';

const DEFAULT_FIELD_COLUMN_WIDTH = 200;
const ROW_INDEX_COLUMN_WIDTH = 50;

interface ImportTableProps<TPayload, TResult> {
  adapter: EntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  session: ImportSessionState;
  actions: EntityImportActions;
}

function fieldColumnWidth(
  field: ImportSessionState['fields'][number],
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
  const [resizeOverrides, setResizeOverrides] = useState<Record<string, number>>({});
  const resizeOverridesRef = useRef(resizeOverrides);
  resizeOverridesRef.current = resizeOverrides;

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
    return ROW_INDEX_COLUMN_WIDTH + fieldsWidth;
  }, [adapter.fields, resizeOverrides]);

  const columns = useMemo<ColumnsType<ImportSessionState['rows'][number]>>(
    () => [
      {
        title: (
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Row
          </span>
        ),
        key: 'row',
        width: ROW_INDEX_COLUMN_WIDTH,
        fixed: 'left',
        render: (_, row) => (
          <span className="text-sm font-semibold text-neutral-500">{row.rowIndex + 1}</span>
        ),
        onCell: () => ({
          className: 'align-top',
        }),
      },
      ...adapter.fields.map((field) => {
        const width = fieldColumnWidth(field, resizeOverrides);

        return {
          title: (
            <div className="relative flex min-h-9 items-center pr-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {field.label}
              </span>
              <button
                type="button"
                tabIndex={0}
                className="absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize rounded-sm border-0 bg-transparent p-0 hover:bg-neutral-200/80"
                aria-label={`Resize ${field.label} column`}
                onMouseDown={(event) => beginResize(event, field.path)}
              />
            </div>
          ),
          key: field.path,
          width,
          ellipsis: true,
          render: (_: unknown, row: ImportSessionState['rows'][number]) => {
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
          onCell: (row: ImportSessionState['rows'][number]) => {
            const cell = row.cells[field.path];
            const isSelected =
              session.selectedCell?.rowId === row.id &&
              session.selectedCell?.fieldPath === field.path;

            return {
              className: cn(
                'align-top !p-0 transition-colors',
                isSelected && 'bg-blue-50/60',
                cell.status === CellStatus.Invalid && 'bg-amber-50/70',
                cell.dependencyState === DependencyState.Blocked && 'bg-neutral-100'
              ),
            };
          },
        };
      }),
    ],
    [actions, adapter.fields, beginResize, context, resizeOverrides, session]
  );

  return (
    <div className="overflow-hidden bg-white">
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        tableLayout="fixed"
        columns={columns}
        dataSource={session.rows}
        scroll={{ x: scrollWidth }}
        className={cn(
          'entity-import-table',
          '[&_.ant-table-thead_.ant-table-cell]:bg-white',
          '[&_.ant-table-cell]:align-top',
          '[&_th.ant-table-cell>span]:text-sm'
        )}
      />
    </div>
  );
}
