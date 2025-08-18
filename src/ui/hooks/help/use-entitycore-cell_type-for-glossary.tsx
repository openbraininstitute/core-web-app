'use client';

import { useCallback, useEffect, useState } from 'react';

import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import type { TypeFilter } from '@/api/entitycore/types/shared/global';

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
  const [state, setState] = useState<{
    data: any;
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
      const args = {
        filters: {
          page: activePage,
          page_size: pageSize,
          ...(filter ? { order_by: filter.order_by } : {}),
        },
      };

      const response = await (cellType === 'm-type' ? getMtypes(args) : getEtypes(args));

      setState({
        data: response,
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
  }, [cellType, activePage, pageSize, filter]);

  useEffect(() => {
    fetchEntityCellTypes();
  }, [fetchEntityCellTypes]);

  return {
    ...state,
    refetch: fetchEntityCellTypes,
  };
};
