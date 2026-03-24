'use client';

import { Table } from 'antd';
import { useMemo } from 'react';

import { cn } from '@/utils/css-class';

import { InlineCell } from './cells/inline-cell';

import type { ColumnsType } from 'antd/es/table';
import type {
  EntityImportActions,
  EntityImportAdapter,
  EntityImportRuntimeContext,
} from '../core/adapter';
import type { ImportSessionState } from '../core/contracts';

interface ImportTableProps<TPayload, TResult> {
  adapter: EntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  session: ImportSessionState;
  actions: EntityImportActions;
}

export function ImportTable<TPayload, TResult>({
  adapter,
  context,
  session,
  actions,
}: ImportTableProps<TPayload, TResult>) {
  const columns = useMemo<ColumnsType<ImportSessionState['rows'][number]>>(
    () => [
      {
        title: (
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Row
          </span>
        ),
        key: 'row',
        width: 88,
        fixed: 'left',
        render: (_, row) => (
          <span className="text-sm font-semibold text-neutral-500">{row.rowIndex + 1}</span>
        ),
        onCell: () => ({
          className: 'align-top',
        }),
      },
      ...adapter.fields.map((field) => ({
        title: (
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {field.label}
          </span>
        ),
        key: field.path,
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
        onCell: (row: ImportSessionState['rows'][number]) => ({
          className: cn(
            'align-top',
            session.selectedCell?.rowId === row.id &&
              session.selectedCell?.fieldPath === field.path &&
              'bg-blue-50/60'
          ),
        }),
      })),
    ],
    [actions, adapter.fields, context, session]
  );

  return (
    <div className="overflow-hidden bg-white">
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={session.rows}
        scroll={{ x: 'max-content' }}
        className={cn(
          'entity-import-table',
          '[&_.ant-table-cell]:bg-white',
          '[&_th.ant-table-cell>span]:text-base'
        )}
      />
    </div>
  );
}
