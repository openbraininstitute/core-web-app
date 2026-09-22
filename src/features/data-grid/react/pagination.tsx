import { Pagination } from 'antd';

import { DEFAULT_PAGE_SIZE_OPTIONS } from '@/features/data-grid/config';
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

import styles from './pagination.module.css';

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
 *
 * The page-button states live in `pagination.module.css` — beating antd needs `!important`
 * throughout, which makes rule order load-bearing and is unreadable as arbitrary variants.
 */
export function GridPagination<Row>({
  controller,
  total,
  page,
  pageSize,
  className,
}: IGridPaginationProps<Row>) {
  // shown even for a single page, always has a size selector
  if (total <= 0) return null;
  const options = controller.schema.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;

  return (
    <div
      data-testid="data-grid-pagination"
      className={cn('flex items-center justify-center gap-3', className)}
    >
      <Pagination
        className={cn('flex items-center gap-1', styles.pagination)}
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
        <SelectTrigger
          data-testid="data-grid-page-size"
          size="sm"
          className={GRID_SELECT_TRIGGER_CLASS}
        >
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
