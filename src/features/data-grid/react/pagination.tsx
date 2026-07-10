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
    <div className="flex items-center justify-end border-t border-gray-100 px-2 py-2.5">
      <Pagination
        className={cn(
          'flex items-center gap-1',
          // items: soft rounded, quiet border, hover lift
          '[&_.ant-pagination-item]:rounded-lg [&_.ant-pagination-item]:border-transparent [&_.ant-pagination-item]:transition-colors',
          '[&_.ant-pagination-item>a]:text-primary-8 [&_.ant-pagination-item:hover]:bg-gray-100',
          // active: filled dark pill
          '[&_.ant-pagination-item-active]:border-transparent [&_.ant-pagination-item-active]:bg-primary-8',
          '[&_.ant-pagination-item-active:hover]:bg-primary-9 [&_.ant-pagination-item-active>a]:font-semibold [&_.ant-pagination-item-active>a]:text-white',
          // prev / next arrows
          '[&_.ant-pagination-prev_.ant-pagination-item-link]:rounded-lg [&_.ant-pagination-next_.ant-pagination-item-link]:rounded-lg',
          '[&_.ant-pagination-prev:hover_.ant-pagination-item-link]:bg-gray-100 [&_.ant-pagination-next:hover_.ant-pagination-item-link]:bg-gray-100',
          // page-size selector
          '[&_.ant-select-selector]:rounded-lg!',
          className
        )}
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
    </div>
  );
}
