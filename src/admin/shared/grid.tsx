'use client';

import { useQuery } from '@tanstack/react-query';

import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { cn } from '@/utils/css-class';
import { errorMessage } from '@/utils/error';

import { isForbidden } from './errors';

import type { QueryKey } from '@tanstack/react-query';
import type { IGridDataSource, IGridQuery } from '@/features/data-grid/core';
import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';

const ADMIN_PAGE_SIZE = 20;
const ROW_HEIGHT = 56;

export function toPageParams({ page, pageSize, sort, params }: IGridQuery) {
  const [primary] = sort;
  return {
    ...params,
    page,
    page_size: pageSize,
    ...(primary && { order_by: primary.columnId, order_direction: primary.direction }),
  };
}

export function pagedSource<Row>(
  list: (
    params: ReturnType<typeof toPageParams>
  ) => Promise<{ data: Row[]; pagination: { total: number } }>
): IGridDataSource<Row> {
  return {
    fetch: async (query) => {
      const { data, pagination } = await list(toPageParams(query));
      return { rows: data, total: pagination.total };
    },
  };
}

export function LoadFailure({ error, what }: { error: unknown; what: string }) {
  return (
    <p className="text-neutral-4 p-5">
      {isForbidden(error)
        ? `Your account can't read ${what}.`
        : `Couldn't load ${what}: ${errorMessage(error)}`}
    </p>
  );
}

// `what` is the plural noun for the loading, empty and error text. Filters belong outside the
// grid: give it a `key` built from them, so a change returns to page 1. A column sorts only if
// it says so, and its id is then the API's `order_by` value.
export function AdminPagedGrid<Row>({
  what,
  columns,
  getRowId,
  dataSource,
  queryKey,
  params,
  onRowClick,
  fill,
}: {
  what: string;
  columns: Array<ISimpleColumn<Row>>;
  getRowId: (row: Row) => string;
  dataSource: IGridDataSource<Row>;
  queryKey: QueryKey;
  params?: Record<string, unknown>;
  onRowClick?: (row: Row) => void;
  fill?: boolean;
}) {
  return (
    <div className={cn('border-neutral-2 rounded-lg border bg-white', fill && 'min-h-0 flex-1')}>
      <SimpleGrid<Row>
        columns={columns.map((column) => ({ ...column, sortable: column.sortable ?? false }))}
        getRowId={getRowId}
        pageSize={ADMIN_PAGE_SIZE}
        pageSizeOptions={[ADMIN_PAGE_SIZE, 50, 100]}
        sortable
        rowHeight={ROW_HEIGHT}
        autoHeight={!fill}
        loadingLabel={what}
        noRowsText={`No ${what}`}
        onRowClick={onRowClick}
        serverSide={{
          dataSource,
          queryKey,
          params,
          renderError: (error) => <LoadFailure error={error} what={what} />,
        }}
      />
    </div>
  );
}

export function AdminRowsGrid<Row>({
  what,
  columns,
  rows,
  getRowId,
}: {
  what: string;
  columns: Array<ISimpleColumn<Row>>;
  rows: Row[];
  getRowId: (row: Row) => string;
}) {
  return (
    <div className="border-neutral-2 rounded-lg border bg-white">
      <SimpleGrid<Row>
        columns={columns}
        rows={rows}
        getRowId={getRowId}
        rowHeight={ROW_HEIGHT}
        noRowsText={`No ${what}`}
      />
    </div>
  );
}

// For a short, unpaged list. Client mode has no loading state of its own.
export function AdminQueryGrid<Row>({
  queryKey,
  queryFn,
  ...grid
}: {
  what: string;
  columns: Array<ISimpleColumn<Row>>;
  getRowId: (row: Row) => string;
  queryKey: QueryKey;
  queryFn: () => Promise<Row[]>;
}) {
  const { data: rows, error } = useQuery({ queryKey, queryFn });

  if (error) return <LoadFailure error={error} what={grid.what} />;
  if (!rows) return <p className="text-neutral-4 p-5">Loading {grid.what}</p>;

  return <AdminRowsGrid {...grid} rows={rows} />;
}
