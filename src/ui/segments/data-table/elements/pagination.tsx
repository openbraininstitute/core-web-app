import { Pagination as AntPagination, type PaginationProps } from 'antd';
import { useAtom } from 'jotai';
import type { ComponentProps } from 'react';

import { pageNumberAtom } from '@/state/explore-section/list-view-atoms';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { cn } from '@/utils/css-class';

import type { Pagination as EntitycorePagination } from '@/api/entitycore/types/shared/response';

type Props = {
  dataKey: string;
  size?: PaginationProps['size'];
  resultPagination?: {
    pagination: EntitycorePagination;
    totalData: number;
  };
  className?: ComponentProps<'ul'>['className'];
};

export function Pagination({ dataKey, size, resultPagination, className }: Props) {
  const [page, updatePage] = useAtom(pageNumberAtom(dataKey));

  return (
    <AntPagination
      responsive
      hideOnSinglePage
      showLessItems
      key="listing-pagination"
      data-testid="listing-pagination"
      pageSize={DEFAULT_PAGE_SIZE}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      onChange={updatePage}
      align="center"
      size={size}
      current={page}
      total={resultPagination?.pagination?.total_items}
      showSizeChanger={false}
      aria-label="pagination for listing results"
      className={cn(
        '[&_.ant-pagination-item-active]:bg-primary-9 [&_.ant-pagination-item-active_a]:text-white!',
        '[&_.ant-pagination-disabled_button]:text-neutral-2 [&_button.ant-pagination-item-link]:text-primary-9',
        className
      )}
    />
  );
}
