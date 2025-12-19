'use client';

import { useCallback, useEffect, useState } from 'react';

import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import type { IEType, IMType } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';

export const useFetchSingleType = ({
  cellType,
  name,
}: {
  cellType: 'e-type' | 'm-type';
  name: string;
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
      const args = {
        filters: {
          pref_label: name,
          page: 1,
          page_size: 1,
        },
      };

      const response = await (cellType === 'm-type' ? getMtypes(args) : getEtypes(args));

      let normalizedResponse: EntityCoreResponse<IEType> | EntityCoreResponse<IMType>;

      if (Array.isArray(response)) {
        normalizedResponse = {
          data: response,
          pagination: {
            page: 1,
            page_size: response.length,
            total_items: 1,
          },
        };
      } else if (
        response &&
        'data' in response &&
        Array.isArray(response.data) &&
        'pagination' in response
      ) {
        normalizedResponse = response;
      } else if (response && 'items' in response && Array.isArray(response.items)) {
        normalizedResponse = {
          data: response.items,
          pagination: {
            page: 1,
            page_size: response.items.length,
            total_items: 1,
          },
        };
      } else {
        throw new Error('Unexpected response format');
      }

      setState({
        data: normalizedResponse,
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
  }, [cellType, name]);

  useEffect(() => {
    fetchEntityCellTypes();
  }, [fetchEntityCellTypes]);

  return {
    ...state,
    refetch: fetchEntityCellTypes,
  };
};
