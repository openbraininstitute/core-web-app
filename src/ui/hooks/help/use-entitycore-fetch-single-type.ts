'use client';

import { useQuery } from '@tanstack/react-query';

import { getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { getMtypes } from '@/api/entitycore/queries/annotations/mtype';
import type { IEType, IMType } from '@/api/entitycore/types/shared/global';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { HELP_QUERY_KEYS } from '@/ui/use-query-keys/help';

export const useFetchSingleType = ({
  cellType,
  name,
}: {
  cellType: 'e-type' | 'm-type';
  name: string;
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: HELP_QUERY_KEYS.entitycore(cellType, name),
    queryFn: async (): Promise<EntityCoreResponse<IEType> | EntityCoreResponse<IMType>> => {
      const args = {
        filters: {
          pref_label: name,
          page: 1,
          page_size: 1,
        },
      };

      const response = await (cellType === 'm-type' ? getMtypes(args) : getEtypes(args));

      if (Array.isArray(response)) {
        return {
          data: response,
          pagination: {
            page: 1,
            page_size: response.length,
            total_items: 1,
          },
        };
      }
      if (
        response &&
        'data' in response &&
        Array.isArray(response.data) &&
        'pagination' in response
      ) {
        return response;
      }
      if (response && 'items' in response && Array.isArray(response.items)) {
        return {
          data: response.items,
          pagination: {
            page: 1,
            page_size: response.items.length,
            total_items: 1,
          },
        };
      }
      throw new Error('Unexpected response format');
    },
    enabled: Boolean(name),
  });

  return {
    data,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
};
