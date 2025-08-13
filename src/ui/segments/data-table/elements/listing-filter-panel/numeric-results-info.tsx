'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { JSX, useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';

import type { Pagination } from '@/api/entitycore/types/shared/response';

const generateDisplayComponent = (
  data:
    | {
        pagination: Pagination;
        totalData: number;
      }
    | undefined
): JSX.Element | null => {
  return match(data)
    .with(P.nullish, () => <strong>0</strong>)
    .with({ pagination: P.nullish }, () => <strong>0</strong>)
    .with(
      {
        totalData: P.nonNullable.select('totalData'),
        pagination: P.nonNullable.select('pagination'),
      },
      ({ totalData, pagination }) => {
        let currentCount =
          pagination?.page && pagination.page_size
            ? (pagination.page - 1) * pagination.page_size + (totalData ?? 0)
            : totalData;
        const totalCount = pagination.total_items || 0;

        currentCount = totalCount > 0 ? currentCount : 0;

        const currentFormatted = currentCount?.toLocaleString('en-US');
        const totalFormatted = totalCount.toLocaleString('en-US');

        return match({ currentCount, totalCount })
          .with({ currentCount: P.when((c) => c > 0), totalCount: P.when((t) => t > 0) }, () => (
            <span>
              <strong>{currentFormatted}</strong> of <strong>{totalFormatted}</strong>
            </span>
          ))
          .otherwise(() => <strong>0</strong>);
      }
    )
    .otherwise(() => null);
};

export function ResultsCount({
  isLoading,
  resultPagination,
}: {
  isLoading?: boolean;
  resultPagination?: {
    pagination: Pagination;
    totalData: number;
  };
}) {
  const [persistedDisplay, setPersistedDisplay] = useState<JSX.Element | null>(null);

  const content = match({ isLoading, resultPagination })
    .with({ isLoading: true }, () =>
      persistedDisplay ? (
        <span className="opacity-45 backdrop-blur-sm">{persistedDisplay}</span>
      ) : (
        <LoadingOutlined />
      )
    )
    .with({ resultPagination: P.not(P.nullish) }, () => generateDisplayComponent(resultPagination))
    .otherwise(() => null);

  useEffect(() => {
    if (!isLoading && resultPagination) {
      setPersistedDisplay(generateDisplayComponent(resultPagination));
    }
  }, [isLoading, resultPagination]);

  return (
    <div
      id="data-count-results"
      data-testid="data-count-results"
      className="flex w-full justify-start"
    >
      <div
        className="text-primary-9 flex items-center gap-1"
        role="status"
        aria-label="listing-view-title"
      >
        <span>Results </span>
        {content}
      </div>
    </div>
  );
}
