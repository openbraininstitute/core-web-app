'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { JSX, useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';

import type { Pagination } from '@/api/entitycore/types/shared/response';

const generateDisplayComponent = (
  data:
    | {
        pagination: Pagination;
        dataLength: number;
      }
    | undefined
): JSX.Element | null => {
  return match(data)
    .with(P.nullish, () => <strong>0</strong>)
    .with({ pagination: P.nullish }, () => <strong>0</strong>)
    .with(
      {
        dataLength: P.nonNullable.select('dataLength'),
        pagination: P.nonNullable.select('pagination'),
      },
      ({ dataLength, pagination }) => {
        let currentCount =
          pagination?.page && pagination.page_size
            ? (pagination.page - 1) * pagination.page_size + (dataLength ?? 0)
            : dataLength;
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
  dataCount,
}: {
  isLoading?: boolean;
  dataCount?: {
    pagination: Pagination;
    dataLength: number;
  };
}) {
  const [persistedDisplay, setPersistedDisplay] = useState<JSX.Element | null>(null);

  const content = match({ isLoading, dataCount })
    .with({ isLoading: true }, () =>
      persistedDisplay ? (
        <span className="opacity-45 backdrop-blur-sm">{persistedDisplay}</span>
      ) : (
        <LoadingOutlined />
      )
    )
    .with({ dataCount: P.not(P.nullish) }, () => generateDisplayComponent(dataCount))
    .otherwise(() => null);

  useEffect(() => {
    if (!isLoading && dataCount) {
      setPersistedDisplay(generateDisplayComponent(dataCount));
    }
  }, [isLoading, dataCount]);

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
