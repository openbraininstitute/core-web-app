'use client';

import { useQuery } from '@tanstack/react-query';

import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import type { TypeFilter } from '@/api/entitycore/types/shared/global';
import { HELP_QUERY_KEYS } from '@/ui/use-query-keys/help';

export const useFetchEntityTypes = ({
  cellType,
  filter,
  activePage = 1,
  pageSize = 100,
}: {
  cellType: 'e-type' | 'm-type';
  filter?: TypeFilter | undefined;
  activePage?: number;
  pageSize?: number;
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: HELP_QUERY_KEYS.entityTypes(cellType, activePage, pageSize, filter),
    queryFn: async () => {
      const args = {
        filters: {
          page: activePage,
          page_size: pageSize,
          ...(filter ? { order_by: filter.order_by } : {}),
        },
      };

      return await (cellType === 'm-type' ? getMtypes(args) : getEtypes(args));
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    data,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
};
