import { Pagination } from 'antd';

import { cn } from '@/utils/css-class';

import type { GridController } from '../core';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface GridPaginationProps<Row> {
  controller: GridController<Row>;
  total: number;
  page: number;
  pageSize: number;
  className?: string;
}

/**
 * Renderer-agnostic server pagination: reads page/total, dispatches `setPage` /
 * `setPageSize`. The size changer offers the schema's `pageSizeOptions`.
 */
export function GridPagination<Row>({
  controller,
  total,
  page,
  pageSize,
  className,
}: GridPaginationProps<Row>) {
  if (total <= 0) return null;
  return (
    <Pagination
      className={cn('flex justify-end py-2', className)}
      current={page}
      pageSize={pageSize}
      total={total}
      showSizeChanger
      pageSizeOptions={controller.schema.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS}
      onChange={(nextPage, nextPageSize) => {
        if (nextPageSize !== pageSize) {
          controller.store.dispatch({ type: 'setPageSize', pageSize: nextPageSize });
        } else {
          controller.store.dispatch({ type: 'setPage', page: nextPage });
        }
      }}
    />
  );
}
