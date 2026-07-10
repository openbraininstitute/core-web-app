import { Pagination } from 'antd';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
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
 * Renderer-agnostic server pagination, centered on the page: fully-rounded page
 * buttons (antd Pagination) with the page-size selector supplied by the app's
 * `ui/molecules` Select (rounded-xl), not antd's built-in size changer.
 */
export function GridPagination<Row>({
  controller,
  total,
  page,
  pageSize,
  className,
}: GridPaginationProps<Row>) {
  if (total <= 0) return null;
  const options = controller.schema.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 border-t border-gray-100 px-2 py-2.5',
        className
      )}
    >
      <Pagination
        className={cn(
          'flex items-center gap-1',
          // fully-rounded page items + quiet hover
          '[&_.ant-pagination-item]:rounded-full [&_.ant-pagination-item]:border-transparent [&_.ant-pagination-item]:transition-colors',
          '[&_.ant-pagination-item>a]:text-primary-8 [&_.ant-pagination-item:hover]:bg-gray-100',
          // active: filled dark circle
          '[&_.ant-pagination-item-active]:border-transparent [&_.ant-pagination-item-active]:bg-primary-8',
          '[&_.ant-pagination-item-active:hover]:bg-primary-9 [&_.ant-pagination-item-active>a]:font-semibold [&_.ant-pagination-item-active>a]:text-white',
          // fully-rounded prev / next
          '[&_.ant-pagination-prev_.ant-pagination-item-link]:rounded-full [&_.ant-pagination-next_.ant-pagination-item-link]:rounded-full',
          '[&_.ant-pagination-prev:hover_.ant-pagination-item-link]:bg-gray-100 [&_.ant-pagination-next:hover_.ant-pagination-item-link]:bg-gray-100'
        )}
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        onChange={(nextPage) => controller.store.dispatch({ type: 'setPage', page: nextPage })}
      />

      <Select
        value={String(pageSize)}
        onValueChange={(v) =>
          controller.store.dispatch({ type: 'setPageSize', pageSize: Number(v) })
        }
      >
        <SelectTrigger size="sm" className="rounded-xl text-sm">
          {/* render the label explicitly — Radix can't derive it until the menu opens once */}
          <SelectValue>{pageSize} / page</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size} / page
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
