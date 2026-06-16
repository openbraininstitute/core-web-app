'use client';

import { CheckCircleFilled, LoadingOutlined } from '@ant-design/icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { upperFirst } from 'es-toolkit/compat';
import { useEffect, useMemo, useRef } from 'react';

import { getEmDenseReconstructionDatasets } from '@/api/entitycore/queries/general/em-dense-reconstruction-dataset';
import { DEFAULT_PAGE_SMALL_SIZE } from '@/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Card } from '@/ui/molecules/card';
import { Skeleton } from '@/ui/molecules/skeleton';
import { EM_DENSE_RECONSTRUCTION_DATASET_TYPE } from '@/ui/segments/workflows/browse/prerequisite/em-dataset-cards.constants';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { TBrowsePrerequisitePickerProps } from '@/ui/segments/workflows/browse/browse-config';

type EmDatasetPrerequisiteCardsProps = TBrowsePrerequisitePickerProps & {
  /** when set, scopes the list query via Entity Core `id__in` */
  idIn?: readonly string[];
};

/**
 * prerequisite picker (cards) for choosing one EM dense reconstruction dataset.
 * pass `idIn` to scope the API request instead of listing every dataset.
 */
export function EmDatasetPrerequisiteCards({
  value,
  onSelect,
  idIn,
}: EmDatasetPrerequisiteCardsProps) {
  const { virtualLabId, projectId } = useWorkspace();
  const context = { virtualLabId, projectId };

  const listFilters = useMemo(
    () => ({
      page_size: DEFAULT_PAGE_SMALL_SIZE,
      ...(idIn?.length ? { id__in: [...idIn] } : {}),
    }),
    [idIn]
  );

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: keyBuilder.emDenseReconstructionDatasets(context, listFilters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getEmDenseReconstructionDatasets({
        context,
        filters: { ...listFilters, page: pageParam },
      }),
    getNextPageParam: (lastPage) => {
      const { page, page_size, total_items } = lastPage.pagination;
      return page * page_size < total_items ? page + 1 : undefined;
    },
  });

  const datasets = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: scrollRef.current, rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
          <Card key={index} className="h-54 animate-pulse bg-gray-50">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full rounded-full bg-gray-200" />
              <Skeleton className="h-4 w-2/3 rounded-full bg-gray-200" />
              <Skeleton className="h-26 w-full rounded-md bg-gray-200" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-600">
        No EM dense reconstruction datasets available.
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto py-4 px-2">
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        role="radiogroup"
        aria-label="EM dense reconstruction datasets"
      >
        {datasets.map((dataset) => {
          const selected = value?.id === dataset.id;
          const select = () =>
            onSelect({
              type: EM_DENSE_RECONSTRUCTION_DATASET_TYPE,
              id: dataset.id,
              row: dataset,
            });
          return (
            <Card
              key={dataset.id}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onClick={select}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  select();
                }
              }}
              className={cn(
                'bg-white shadow-xs hover:shadow-md hover:border-gray-200!',
                'relative cursor-pointer gap-2 transition-colors hover:border-primary-6 ',
                {
                  'ring-2 ring-primary-7 bg-gray-50 transition-all duration-300 ease-in-out':
                    selected,
                }
              )}
            >
              {selected && (
                <CheckCircleFilled className="absolute right-3 top-3 text-primary-7 [&_svg]:size-5" />
              )}
              <span className="line-clamp-2 pr-6 font-bold text-lg text-primary-9">
                {dataset.name}
              </span>
              {dataset.brain_region?.name && (
                <span className="text-gray-600 mb-5 text-base">
                  {upperFirst(dataset.brain_region.name)}
                </span>
              )}
              {dataset.description && (
                <span className=" text-gray-500 text-base">{dataset.description}</span>
              )}
            </Card>
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-px" />

      {isFetchingNextPage && (
        <div className="flex items-center justify-center gap-2 py-4 text-gray-600">
          <LoadingOutlined /> Loading more…
        </div>
      )}
    </div>
  );
}
