import { Pagination as AntPagination, type PaginationProps } from 'antd';
import { useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import type { ComponentProps } from 'react';

import { useDataListStoreSession } from '@/ui/segments/data-table/elements/helpers';
import { corePageNumberAtom } from '@/ui/segments/data-table/elements/context';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { cn } from '@/utils/css-class';

import type { Pagination as EntitycorePagination } from '@/api/entitycore/types/shared/response';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type Props = {
  dataKey: string;
  dataType: TExtendedEntitiesTypeDict;
  size?: PaginationProps['size'];
  resultPagination?: {
    pagination: EntitycorePagination;
    totalData: number;
  };
  className?: ComponentProps<'ul'>['className'];
};

export function Pagination({ dataKey, size, resultPagination, className, dataType }: Props) {
  const [page, updatePage] = useAtom(corePageNumberAtom(dataKey));
  const { sessionValue: dataListStoreSession, setSessionValue: updateDataListStoreSession } =
    useDataListStoreSession({ dataKey, dataType });
  const lastTotalItemsRef = useRef<number | undefined>(undefined);
  const lastDataKeyRef = useRef<string>(dataKey);

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

  const onUpdatePage = (p: number) => {
    updateDataListStoreSession({ ...dataListStoreSession, Page: p });
    updatePage(p);
  };

  if (totalItems === undefined) {
    return null;
  }

  return (
    <AntPagination
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
        '[&_.ant-pagination-item-active]:bg-primary-9 [&_.ant-pagination-item-active_a]:text-white!',
        '[&_.ant-pagination-disabled_button]:text-neutral-2 [&_button.ant-pagination-item-link]:text-primary-9',
        className
      )}
    />
  );
}
