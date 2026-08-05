import { Pagination } from 'antd';

import { GridActionType } from '@/features/data-grid/core';
import {
  GRID_SELECT_CONTENT_CLASS,
  GRID_SELECT_ITEM_CLASS,
  GRID_SELECT_TRIGGER_CLASS,
} from '@/features/data-grid/react/molecules-theme';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import type { GridController } from '@/features/data-grid/core';

// includes 30 — the app-wide DEFAULT_PAGE_SIZE — so the selector shows the active value
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

export interface IGridPaginationProps<Row> {
  controller: GridController<Row>;
  total: number;
  page: number;
  pageSize: number;
  className?: string;
}

/**
 * Renderer-agnostic server pagination: antd `Pagination` for the page buttons, with the
 * page-size selector supplied by the app's `ui/molecules` Select rather than antd's.
 */
export function GridPagination<Row>({
  controller,
  total,
  page,
  pageSize,
  className,
}: IGridPaginationProps<Row>) {
  // hidden when there's nothing to paginate — zero results or a single page
  if (total <= 0 || Math.ceil(total / pageSize) <= 1) return null;
  const options = controller.schema.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;

  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <Pagination
        className={cn(
          'flex items-center gap-1',
          '[&_.ant-pagination-item]:rounded-full [&_.ant-pagination-item]:border-transparent [&_.ant-pagination-item]:transition-colors',
          '[&_.ant-pagination-item>a]:text-primary-8 [&_.ant-pagination-item:hover]:bg-gray-100',
          '[&_.ant-pagination-item-active]:border-transparent [&_.ant-pagination-item-active]:bg-primary-8',
          '[&_.ant-pagination-item-active:hover]:bg-primary-9 [&_.ant-pagination-item-active>a]:font-semibold [&_.ant-pagination-item-active>a]:text-white!',
          '[&_.ant-pagination-prev_.ant-pagination-item-link]:rounded-full [&_.ant-pagination-next_.ant-pagination-item-link]:rounded-full',
          '[&_.ant-pagination-prev:hover_.ant-pagination-item-link]:bg-gray-100 [&_.ant-pagination-next:hover_.ant-pagination-item-link]:bg-gray-100'
        )}
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        onChange={(nextPage) =>
          controller.store.dispatch({ type: GridActionType.SetPage, page: nextPage })
        }
      />

      <Select
        value={String(pageSize)}
        onValueChange={(v) =>
          controller.store.dispatch({ type: GridActionType.SetPageSize, pageSize: Number(v) })
        }
      >
        <SelectTrigger size="sm" className={GRID_SELECT_TRIGGER_CLASS}>
          {/* render the label explicitly — Radix can't derive it until the menu opens once */}
          <SelectValue>{pageSize} / page</SelectValue>
        </SelectTrigger>
        <SelectContent className={GRID_SELECT_CONTENT_CLASS}>
          {options.map((size) => (
            <SelectItem key={size} value={String(size)} className={GRID_SELECT_ITEM_CLASS}>
              {size} / page
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
