'use client';

import { useCallback, useEffect, useState } from 'react';

import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import type { IEType, IMType } from '@/api/entitycore/types/shared/global';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';

export const useFetchEModelEntityTypes = ({ cellType }: { cellType: 'e-type' | 'm-type' }) => {
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
      const args = { filters: { page: 1, page_size: 100 } };
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
  }, [cellType]);

  useEffect(() => {
    fetchEntityCellTypes();
  }, [fetchEntityCellTypes]);

  return {
    ...state,
    refetch: fetchEntityCellTypes,
  };
};
