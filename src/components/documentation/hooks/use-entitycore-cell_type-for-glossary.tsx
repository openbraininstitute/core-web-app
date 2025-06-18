'use client';

import { useCallback, useEffect, useState } from 'react';

import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import type { IEType, IMType, TypeFilter } from '@/api/entitycore/types/shared/global';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';

export const useFetchEntityTypes = ({
  cellType,
  filter,
}: {
  cellType: 'e-type' | 'm-type';
  filter?: TypeFilter | undefined;
}) => {
  const [state, setState] = useState<{
    data: EntityCoreResponse<IEType> | EntityCoreResponse<IMType> | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchEntityCellTypes = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let currentPage = 1;
      const pageSize = 100;
      let allItems: IEType[] | IMType[] = [];
      let hasMore = true;

      while (hasMore) {
        const args = {
          filters: {
            page: currentPage,
            page_size: pageSize,
            ...(filter ? { order_by: filter.order_by } : {}),
          },
        };

        const response = await (cellType === 'm-type' ? getMtypes(args) : getEtypes(args));

        let items: IEType[] | IMType[] = [];
        if (Array.isArray(response)) {
          items = response;
        } else if (response && 'data' in response && Array.isArray(response.data)) {
          items = response.data;
        } else if (response && 'items' in response && Array.isArray(response.items)) {
          items = response.items;
        } else {
          hasMore = false;
          break;
        }

        allItems = [...allItems, ...items];

        hasMore = items.length === pageSize;

        currentPage += 1;
      }

      setState({
        data: { data: allItems } as EntityCoreResponse<IEType> | EntityCoreResponse<IMType>,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'An unknown error occurred',
      });
    }
  }, [cellType, filter]);

  useEffect(() => {
    fetchEntityCellTypes();
  }, [fetchEntityCellTypes]);

  return {
    ...state,
    refetch: fetchEntityCellTypes,
  };
};
