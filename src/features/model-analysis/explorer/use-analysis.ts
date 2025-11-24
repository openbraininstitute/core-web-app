'use client';

import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { getValidationResults } from '@/api/entitycore/queries/general/validation-result';
import { getAssets } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { DEFAULT_PAGE_XSMALL_SIZE } from '@/constants';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { IValidationResult } from '@/api/entitycore/types/entities/validation-result';
import type { WorkspaceContext } from '@/types/common';

export function useAnalysis({ workspace, id }: { id: string; workspace: WorkspaceContext }) {
  const query = useInfiniteQuery({
    queryKey: keyBuilder.validationResults({
      context: workspace,
      id,
    }),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getValidationResults({
        context: workspace,
        filters: { validated_entity_id: id, page: pageParam, page_size: DEFAULT_PAGE_XSMALL_SIZE },
      });
      const data = (
        await Promise.allSettled(
          response.data.map((entity: IValidationResult) => {
            return getAssets({
              ctx: workspace,
              entityType: EntityTypeDict.ValidationResult,
              entityId: entity.id,
            });
          })
        )
      ).map((result, i) => {
        return {
          ...response.data[i],
          assets: result.status === 'fulfilled' ? result.value.data : null,
          error: result.status === 'rejected' ? result.reason : null,
        };
      });
      return {
        data,
        pagination: response.pagination,
      };
    },

    getNextPageParam: (lastPage) => {
      const { page, page_size: pageSize, total_items: totalItems } = lastPage.pagination;
      const totalPages = Math.ceil(totalItems / pageSize);
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!id,
    select(data) {
      return {
        data: data.pages.flatMap((page) => page.data),
        pagination: data.pages[data.pages.length - 1].pagination,
      };
    },
  });

  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.hasNextPage, query.isFetchingNextPage, query.data]);

  return query;
}

export type TValidationResultData = Awaited<ReturnType<typeof useAnalysis>>['data'];
export type TValidationResultNonUndefined = Exclude<TValidationResultData, undefined>['data'];
