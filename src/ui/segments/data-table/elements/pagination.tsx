import { Pagination as AntPagination, type PaginationProps } from 'antd';
import { useAtom } from 'jotai';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef } from 'react';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { Pagination as EntitycorePagination } from '@/api/entitycore/types/shared/response';

import { DEFAULT_PAGE_SIZE, type TWorkspaceSection } from '@/constants';
import {
  corePageNumberAtom,
  useDataListStateSnapshotActions,
} from '@/ui/segments/data-table/elements/context';
import { cn } from '@/utils/css-class';

type Props = {
  dataKey: string;
  dataType: TExtendedEntitiesTypeDict;
  section?: TWorkspaceSection;
  size?: PaginationProps['size'];
  resultPagination?: {
    pagination: EntitycorePagination;
    totalData: number;
  };
  className?: ComponentProps<'ul'>['className'];
};

const scrollTableToTop = () => {
  const tableBody = document.querySelector('#data-table-with-filters .ant-table-body');
  if (tableBody) {
    tableBody.scrollTo({ top: 0, behavior: 'instant' });
  }
};

export function Pagination({
  dataKey,
  size,
  section,
  dataType,
  resultPagination,
  className,
}: Props) {
  const [page, updatePage] = useAtom(corePageNumberAtom(dataKey));
  const lastTotalItemsRef = useRef<number | undefined>(undefined);
  const lastDataKeyRef = useRef<string>(dataKey);
  const { sync: runStorageSync } = useDataListStateSnapshotActions({
    dataKey,
    dataType,
    section,
  });

  useEffect(() => {
    if (lastDataKeyRef.current !== dataKey) {
      lastTotalItemsRef.current = undefined;
      lastDataKeyRef.current = dataKey;
    }
  }, [dataKey]);

  useEffect(() => {
    if (resultPagination?.pagination?.total_items !== undefined) {
      lastTotalItemsRef.current = resultPagination.pagination.total_items;
    }
  }, [resultPagination?.pagination?.total_items]);

  const totalItems = resultPagination?.pagination?.total_items ?? lastTotalItemsRef.current;

  const onUpdatePage = useCallback(
    (p: number) => {
      scrollTableToTop();
      updatePage(p);
      runStorageSync({ Page: p });
    },
    [updatePage, runStorageSync]
  );

  if (totalItems === undefined) {
    return null;
  }

  return (
    <AntPagination
      aria-labelledby="browse-pagination"
      aria-description={dataKey}
      responsive
      showLessItems
      hideOnSinglePage
      key="listing-pagination"
      data-testid="listing-pagination"
      pageSize={DEFAULT_PAGE_SIZE}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      onChange={onUpdatePage}
      align="center"
      size={size}
      current={page}
      total={totalItems}
      showSizeChanger={false}
      aria-label="pagination for listing results"
      className={cn(
        '[&_.ant-pagination-item-active]:bg-primary-9! [&_.ant-pagination-item-active_a]:text-white!',
        '[&_.ant-pagination-disabled_button]:text-neutral-2! [&_button.ant-pagination-item-link]:text-primary-9!',
        className
      )}
    />
  );
}
