import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import { Pagination as AntPagination } from 'antd';

import { cn } from '@/utils/css-class';

import type { PaginationProps } from 'antd';

type Props = {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
};

const itemRender: PaginationProps['itemRender'] = (_page, type, originalElement) => {
  if (type === 'prev') {
    return (
      <button
        type="button"
        aria-label="Previous page"
        className="inline-flex items-center justify-center min-w-6! min-h-6! border-none! mx-3"
      >
        <RiArrowLeftSLine className="size-5" />
      </button>
    );
  }
  if (type === 'next') {
    return (
      <button
        type="button"
        aria-label="Next page"
        className="inline-flex items-center justify-center min-w-6! min-h-6! border-none! mx-3"
      >
        <RiArrowRightSLine className="size-5" />
      </button>
    );
  }
  return originalElement;
};

export function ListPagination({ current, pageSize, total, onChange, className }: Props) {
  if (total <= pageSize) return null;

  return (
    <div className={cn('flex shrink-0 justify-center pt-2', className)}>
      <AntPagination
        current={current}
        pageSize={pageSize}
        total={total}
        onChange={onChange}
        showSizeChanger={false}
        hideOnSinglePage
        size="small"
        showLessItems
        itemRender={itemRender}
        className={cn(
          '[&_.ant-pagination-item]:rounded-full',
          '[&_.ant-pagination-item>a]:rounded-full',
          '[&_.ant-pagination-prev>button]:rounded-full [&_.ant-pagination-prev>button]:border [&_.ant-pagination-prev>button]:border-gray-200 [&_.ant-pagination-prev>button]:size-6 [&_.ant-pagination-prev>button]:text-primary-9',
          '[&_.ant-pagination-next>button]:rounded-full [&_.ant-pagination-next>button]:border [&_.ant-pagination-next>button]:border-gray-200 [&_.ant-pagination-next>button]:size-6 [&_.ant-pagination-next>button]:text-primary-9',
          '[&_.ant-pagination-jump-prev_.ant-pagination-item-link]:rounded-full',
          '[&_.ant-pagination-jump-next_.ant-pagination-item-link]:rounded-full',
          '[&_.ant-pagination-item-active]:bg-primary-9! [&_.ant-pagination-item-active>a]:text-white!',
          '[&_.ant-pagination-item-active]:border-primary-9!'
        )}
      />
    </div>
  );
}
